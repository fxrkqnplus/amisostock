import { readdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ESLint } from 'eslint';
import * as prettier from 'prettier';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const task = process.argv[2];
const excluded = new Set([
  'node_modules',
  '.git',
  '.turbo',
  'dist',
  'coverage',
]);

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory() && !excluded.has(entry.name))
      result.push(...(await filesIn(path)));
    else if (entry.isFile()) result.push(path);
  }
  return result;
}

const relativePath = (path) => relative(root, path).replaceAll('\\', '/');
const files = await filesIn(root);
const configs = files.filter((path) =>
  /^(apps|packages)\/[^/]+\/tsconfig\.json$/.test(relativePath(path)),
);

function run(entry, args) {
  const result = spawnSync(
    process.execPath,
    [resolve(root, 'node_modules', entry), ...args],
    {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, TURBO_TELEMETRY_DISABLED: '1', DO_NOT_TRACK: '1' },
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function scope(label, paths, ruleCount) {
  process.stdout.write(
    `[scope:${label}] files=${paths.length} rules=${ruleCount}\n`,
  );
  for (const path of paths) process.stdout.write(`  ${relativePath(path)}\n`);
}

if (task === 'typecheck' || task === 'build') {
  const inputs = new Set();
  for (const config of configs) {
    const loaded = ts.readConfigFile(config, ts.sys.readFile);
    if (loaded.error)
      throw new Error(
        ts.flattenDiagnosticMessageText(loaded.error.messageText, '\n'),
      );
    const parsed = ts.parseJsonConfigFileContent(
      loaded.config,
      ts.sys,
      resolve(config, '..'),
    );
    if (parsed.errors.length)
      throw new Error(
        ts.formatDiagnosticsWithColorAndContext(parsed.errors, {
          getCurrentDirectory: () => root,
          getCanonicalFileName: (name) => name,
          getNewLine: () => '\n',
        }),
      );
    for (const path of parsed.fileNames) inputs.add(path);
  }
  scope(task, [...inputs], '1 (TypeScript compilation)');
  process.stdout.write(
    `[scope:${task}] packages=${configs.length}; dependency declarations checked; tests run separately\n`,
  );
  run('turbo/bin/turbo', ['run', task, '--force']);
  if (task === 'build') {
    for (const config of configs) {
      const output = resolve(config, '../dist/index.js');
      const module = await import(pathToFileURL(output).href);
      const manifest = JSON.parse(
        await readFile(resolve(config, '../package.json'), 'utf8'),
      );
      if (module.PACKAGE_NAME !== manifest.name)
        throw new Error(`Build smoke failed: ${manifest.name}`);
      process.stdout.write(
        `[build:smoke] ${manifest.name}: compiled ESM loaded\n`,
      );
    }
    process.stdout.write(
      `[scope:build:smoke] modules=${configs.length}; product servers=0; browser bundles=0\n`,
    );
  }
} else if (task === 'lint') {
  const eslint = new ESLint({ cwd: root, fix: process.argv.includes('--fix') });
  const candidates = files.filter((path) => /\.(?:mjs|ts|tsx)$/.test(path));
  const targets = [];
  for (const path of candidates)
    if (!(await eslint.isPathIgnored(path))) targets.push(path);
  const rules = new Set();
  const localFiles = [];
  for (const path of targets) {
    const config = await eslint.calculateConfigForFile(path);
    for (const [name, setting] of Object.entries(config.rules ?? {})) {
      if ((Array.isArray(setting) ? setting[0] : setting) !== 0)
        rules.add(name);
    }
    if (
      config.rules?.['local/no-hardcoded-path']?.[0] === 2 &&
      config.rules?.['local/no-bare-jsx-text']?.[0] === 2
    )
      localFiles.push(path);
  }
  scope('lint', targets, rules.size);
  scope('lint:local', localFiles, 2);
  const results = await eslint.lintFiles(targets);
  if (process.argv.includes('--fix')) await ESLint.outputFixes(results);
  const formatter = await eslint.loadFormatter('stylish');
  process.stdout.write(formatter.format(results));
  const errors = results.reduce((sum, result) => sum + result.errorCount, 0);
  const warnings = results.reduce(
    (sum, result) => sum + result.warningCount,
    0,
  );
  process.stdout.write(`[lint] errors=${errors} warnings=${warnings}\n`);
  if (errors || warnings) process.exitCode = 1;
} else if (task === 'test') {
  const tests = files.filter(
    (path) =>
      /^(?:scripts|tools|packages)\//.test(relativePath(path)) &&
      /\.test\.(?:ts|mjs)$/.test(path),
  );
  run('vitest/vitest.mjs', [
    'run',
    '--coverage',
    '--reporter=verbose',
    '--reporter=json',
    '--outputFile=coverage/test-results.json',
  ]);
  const result = JSON.parse(
    await readFile(resolve(root, 'coverage/test-results.json'), 'utf8'),
  );
  if (result.numTotalTests === 0 || result.numFailedTests !== 0)
    throw new Error('No passing test inventory was produced.');
  scope('test', tests, `${result.numTotalTests} (test cases)`);
  const coverage = JSON.parse(
    await readFile(resolve(root, 'coverage/coverage-summary.json'), 'utf8'),
  );
  scope(
    'test:coverage',
    Object.keys(coverage).filter((path) => path !== 'total'),
    '4 (statements, branches, functions, lines >=70%)',
  );
} else if (task === 'format' || task === 'format:check') {
  const targets = [];
  for (const path of files) {
    const info = await prettier.getFileInfo(path, {
      ignorePath: resolve(root, '.prettierignore'),
    });
    if (!info.ignored && info.inferredParser) targets.push(path);
  }
  scope(task, targets, '1 (Prettier format)');
  let failures = 0;
  for (const path of targets) {
    const content = await readFile(path, 'utf8');
    const options = { ...(await prettier.resolveConfig(path)), filepath: path };
    if (task === 'format')
      await writeFile(path, await prettier.format(content, options));
    else if (!(await prettier.check(content, options))) {
      failures += 1;
      process.stderr.write(`[format:check] FAIL ${relativePath(path)}\n`);
    }
  }
  process.stdout.write(
    `[${task}] checked=${targets.length} failures=${failures}\n`,
  );
  if (failures) process.exitCode = 1;
} else {
  throw new Error(`Unknown check: ${task}`);
}
