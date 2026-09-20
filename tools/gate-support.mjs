import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

export { ts };
export const slash = (path) => path.replaceAll('\\', '/');
export function filesIn(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .flatMap((entry) => {
      if (
        ['node_modules', 'dist', '.git', '.turbo', 'coverage'].includes(
          entry.name,
        )
      )
        return [];
      const path = resolve(root, entry.name);
      return entry.isDirectory() ? filesIn(path) : [path];
    })
    .sort();
}
export function sources(root, directories = ['apps', 'packages']) {
  return directories
    .flatMap((name) => filesIn(resolve(root, name)))
    .filter(
      (path) =>
        /\.(?:[cm]?[jt]s|tsx|jsx)$/.test(path) &&
        !/\.(?:test|spec|d)\./.test(path),
    );
}
export function syntax(path) {
  const source = ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  if (source.parseDiagnostics.length) throw new Error(`Cannot parse ${path}`);
  return source;
}
export function walk(node, visit) {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
}
export function model(paths) {
  const program = ts.createProgram(paths, {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    allowJs: true,
    jsx: ts.JsxEmit.Preserve,
    strict: true,
    noEmit: true,
  });
  return { program, checker: program.getTypeChecker() };
}
export function properties(checker, node) {
  return new Set(
    checker
      .getTypeAtLocation(node)
      .getProperties()
      .map((property) => property.name),
  );
}
export function report(name, result) {
  process.stdout.write(
    `[scope:${name}] files=${result.files.length} rules=${result.rules} candidates=${result.candidates ?? result.files.length}\n`,
  );
  for (const file of result.files) process.stdout.write(`  ${file}\n`);
  process.stdout.write(
    `[${name}] ${result.violations.length} bulundu; ${result.note ?? 'tarama tamamlandı'}\n`,
  );
  for (const violation of result.violations)
    process.stderr.write(`${violation}\n`);
  process.exitCode = result.violations.length ? 1 : 0;
}
export function cli(meta, name, check) {
  if (
    !process.argv[1] ||
    meta.url !== pathToFileURL(resolve(process.argv[1])).href
  )
    return;
  const root = resolve(process.argv[2] ?? process.cwd());
  return Promise.resolve()
    .then(() => check(root))
    .then((result) => report(name, result))
    .catch((error) => {
      process.stderr.write(`[${name}] bakılmadı: ${error.message}\n`);
      process.exitCode = 1;
    });
}
export const names = (root, paths) =>
  paths.map((path) => slash(relative(root, path)));
