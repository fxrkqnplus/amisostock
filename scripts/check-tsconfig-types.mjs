import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));

export function hasExplicitTypes(config) {
  const compilerOptions = config?.compilerOptions;
  return (
    compilerOptions !== null &&
    typeof compilerOptions === 'object' &&
    Object.hasOwn(compilerOptions, 'types') &&
    Array.isArray(compilerOptions.types) &&
    compilerOptions.types.every((type) => typeof type === 'string')
  );
}

export function checkTsconfigTypes(root = repositoryRoot) {
  const files = [];
  const errors = [];

  for (const workspace of ['apps', 'packages']) {
    const workspacePath = join(root, workspace);
    if (!existsSync(workspacePath)) {
      errors.push(`${workspace}: workspace directory is missing.`);
      continue;
    }

    const entries = readdirSync(workspacePath, { withFileTypes: true }).sort(
      (left, right) => left.name.localeCompare(right.name),
    );
    for (const entry of entries) {
      const packageRoot = join(workspacePath, entry.name);
      if (
        !entry.isDirectory() ||
        !existsSync(join(packageRoot, 'package.json'))
      ) {
        continue;
      }

      const configPath = join(packageRoot, 'tsconfig.json');
      const displayPath = relative(root, configPath).replaceAll('\\', '/');
      files.push(displayPath);
      if (!existsSync(configPath)) {
        errors.push(`${displayPath}: tsconfig.json is missing.`);
        continue;
      }

      try {
        const config = JSON.parse(readFileSync(configPath, 'utf8'));
        if (!hasExplicitTypes(config)) {
          errors.push(
            `${displayPath}: compilerOptions.types must be an explicit array of strings.`,
          );
        }
      } catch (error) {
        errors.push(`${displayPath}: cannot read valid JSON: ${error.message}`);
      }
    }
  }

  if (files.length === 0) {
    errors.push('No workspace packages were inspected.');
  }
  return { files, errors };
}

export function main(root = repositoryRoot) {
  const { files, errors } = checkTsconfigTypes(root);
  process.stdout.write(
    `[tsconfig-types] scope: files=${files.length}, rules=1 (explicit-types)\n`,
  );
  for (const file of files) {
    process.stdout.write(`[tsconfig-types] file: ${file}\n`);
  }

  if (errors.length > 0) {
    for (const error of errors) {
      process.stderr.write(`[tsconfig-types] FAIL ${error}\n`);
    }
    process.exitCode = 1;
    return;
  }
  process.stdout.write(
    `[tsconfig-types] PASS packages=${files.length}, violations=0\n`,
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
