import {
  cli,
  model,
  names,
  properties,
  sources,
  ts,
  walk,
} from '../gate-support.mjs';

const fields = ['value', 'source', 'asOf', 'freshness'];
const numericName =
  /(?:value|price|amount|quote|rate|score|yield|ratio|volume|total)/i;
export function check(root) {
  const paths = sources(root);
  const { program, checker } = model(paths);
  const violations = [];
  let candidates = 0;
  function verify(node, source, label) {
    candidates++;
    const keys = properties(checker, node);
    const missing = fields.filter((field) => !keys.has(field));
    if (missing.length)
      violations.push(
        `${label}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}: freshness: missing ${missing.join(',')}`,
      );
  }
  for (const file of paths) {
    const source = program.getSourceFile(file);
    if (source.parseDiagnostics.length) throw new Error(`Cannot parse ${file}`);
    const label = names(root, [file])[0];
    walk(source, (node) => {
      // All explicit value envelopes, including reports outside the web package.
      if (
        ts.isObjectLiteralExpression(node) &&
        node.properties.some((property) => property.name?.text === 'value')
      )
        verify(node, source, label);
      if (
        ts.isCallExpression(node) &&
        /(?:render|display|report|exportCsv|exportReport|sendReport)/i.test(
          node.expression.getText(source),
        )
      ) {
        for (const argument of node.arguments) verify(argument, source, label);
      }
      if (ts.isJsxExpression(node) && node.expression) {
        const expression = node.expression;
        const type = checker.getTypeAtLocation(expression);
        const numeric =
          !!(type.flags & ts.TypeFlags.NumberLike) ||
          numericName.test(expression.getText(source));
        if (!numeric) return;
        // A scalar display is valid only when its owning envelope is intact.
        const envelope =
          ts.isPropertyAccessExpression(expression) &&
          expression.name.text === 'value'
            ? expression.expression
            : expression;
        verify(envelope, source, label);
      }
    });
  }
  return {
    files: names(root, paths),
    rules: 3,
    candidates,
    violations,
    note: candidates
      ? 'değer zarfları ve arayüz/rapor geçişleri tarandı'
      : 'kaynaklar tarandı; değer geçişi=0; ürün tazelik sözleşmesine bakılmadı (henüz yok)',
  };
}
await cli(import.meta, 'freshness', check);
