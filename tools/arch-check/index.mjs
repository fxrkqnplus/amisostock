import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  cli,
  names,
  slash,
  sources,
  syntax,
  ts,
  walk,
} from '../gate-support.mjs';

const layers = {
  'apps/web': ['shared', 'ui'],
  'apps/api': ['shared', 'db', 'engine', 'data', 'ai'],
  'apps/worker': ['shared', 'db', 'engine', 'data', 'ai'],
  'packages/data': ['shared'],
  'packages/ai': ['shared'],
  'packages/db': ['shared'],
  'packages/ui': ['shared'],
  'packages/engine': ['shared'],
  'packages/shared': [],
  scripts: [],
};
const owner = (path) =>
  path.startsWith('scripts/')
    ? 'scripts'
    : path.split('/').slice(0, 2).join('/');
function imports(source) {
  const result = [];
  walk(source, (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier
    )
      result.push(node.moduleSpecifier);
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument))
      result.push(node.argument.literal);
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        node.expression.getText(source) === 'require')
    )
      result.push(node.arguments[0]);
  });
  return result;
}
function destination(root, file, specifier) {
  if (specifier.startsWith('@amisostock/')) {
    const [name, ...rest] = specifier.slice('@amisostock/'.length).split('/');
    const folder = existsSync(resolve(root, 'apps', name))
      ? 'apps'
      : 'packages';
    return resolve(root, folder, name, 'src', rest.join('/') || 'index.ts');
  }
  if (specifier.startsWith('.')) return resolve(dirname(file), specifier);
  return undefined;
}
function existing(path) {
  if (!path) return undefined;
  return [
    path,
    path.replace(/\.js$/, '.ts'),
    `${path}.ts`,
    `${path}.tsx`,
    resolve(path, 'index.ts'),
  ].find(existsSync);
}
export function check(root) {
  const paths = sources(root, ['apps', 'packages', 'scripts']);
  const relative = names(root, paths);
  const violations = [];
  const pure = new Set(
    paths.filter((path, index) =>
      relative[index].startsWith('packages/engine/'),
    ),
  );
  const queue = [...pure];
  // Check the actual shared dependency closure as well: engine may only use pure helpers.
  for (const file of queue) {
    for (const spec of imports(syntax(file))) {
      if (!spec || !ts.isStringLiteralLike(spec)) continue;
      const target = existing(destination(root, file, spec.text));
      if (target && !pure.has(target)) {
        pure.add(target);
        queue.push(target);
      }
    }
  }
  for (const file of new Set([...paths, ...pure])) {
    const label = slash(file).slice(slash(root).length + 1);
    const layer = owner(label);
    const source = syntax(file);
    for (const spec of imports(source)) {
      if (!spec || !ts.isStringLiteralLike(spec)) {
        // scripts/run-check loads compiled outputs for the mandatory build smoke.
        if (
          label !== 'scripts/run-check.mjs' ||
          spec?.getText(source) !== 'pathToFileURL(output).href'
        )
          violations.push(
            `${label}: layer: non-literal import cannot be verified`,
          );
        continue;
      }
      const target = destination(root, file, spec.text);
      const targetLayer =
        target && owner(slash(target).slice(slash(root).length + 1));
      if (
        targetLayer &&
        /^(?:apps|packages)\//.test(targetLayer) &&
        targetLayer !== layer &&
        !(layers[layer] ?? []).includes(targetLayer.replace('packages/', ''))
      )
        violations.push(`${label}: layer: ${layer} -> ${spec.text}`);
      if (
        pure.has(file) &&
        /^(?:node:|fs(?:\/|$)|https?(?:\/|$)|net$|dns$|tls$|dgram$|child_process$|worker_threads$|axios$|undici$|pg$|ioredis$|@amisostock\/(?:db|data)(?:\/|$))/.test(
          spec.text,
        )
      )
        violations.push(`${label}: purity: import ${spec.text}`);
    }
    if (!pure.has(file)) continue;
    walk(source, (node) => {
      if (
        ts.isIdentifier(node) &&
        [
          'fetch',
          'WebSocket',
          'XMLHttpRequest',
          'globalThis',
          'global',
          'window',
          'process',
          'performance',
          'setTimeout',
          'setInterval',
        ].includes(node.text)
      )
        violations.push(`${label}: purity: global ${node.text}`);
      if (
        (ts.isPropertyAccessExpression(node) ||
          ts.isElementAccessExpression(node)) &&
        /^(Date|Math)$/.test(node.expression.getText(source))
      ) {
        const member = ts.isPropertyAccessExpression(node)
          ? node.name.text
          : node.argumentExpression.text;
        if (['now', 'random'].includes(member))
          violations.push(`${label}: purity: ${node.getText(source)}`);
      }
      if (
        ts.isNewExpression(node) &&
        node.expression.getText(source) === 'Date' &&
        !node.arguments?.length
      )
        violations.push(`${label}: purity: implicit clock`);
      if (ts.isVariableStatement(node) && ts.isSourceFile(node.parent)) {
        for (const declaration of node.declarationList.declarations) {
          if (
            !(node.declarationList.flags & ts.NodeFlags.Const) ||
            (declaration.initializer &&
              (ts.isObjectLiteralExpression(declaration.initializer) ||
                ts.isArrayLiteralExpression(declaration.initializer) ||
                ts.isNewExpression(declaration.initializer)))
          )
            violations.push(`${label}: purity: mutable module state`);
        }
      }
    });
  }
  return {
    files: relative,
    rules: 7,
    violations,
    note: `katman ve saflık tarandı; pureFiles=${pure.size}; test dosyaları hariç`,
  };
}
await cli(import.meta, 'arch', check);
