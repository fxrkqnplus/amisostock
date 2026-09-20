import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));

export function validateNodeVersion(requiredVersion, actualVersion) {
  if (!/^\d+\.\d+\.\d+$/.test(requiredVersion)) {
    throw new Error(
      '.nvmrc must contain one exact Node version (major.minor.patch).',
    );
  }

  if (actualVersion !== requiredVersion) {
    throw new Error(
      `Node version mismatch: required=${requiredVersion}, actual=${actualVersion}.`,
    );
  }
}

export function checkNodeVersion(root = repositoryRoot) {
  const requiredVersion = readFileSync(resolve(root, '.nvmrc'), 'utf8').trim();
  validateNodeVersion(requiredVersion, process.versions.node);
  return { requiredVersion, actualVersion: process.versions.node };
}

export function main(root = repositoryRoot) {
  process.stdout.write(
    '[node-version] scope: files=1, rules=1 (exact-node-version)\n',
  );
  process.stdout.write('[node-version] files: .nvmrc\n');

  try {
    const { requiredVersion, actualVersion } = checkNodeVersion(root);
    process.stdout.write(
      `[node-version] PASS required=${requiredVersion}, actual=${actualVersion}\n`,
    );
  } catch (error) {
    process.stderr.write(`[node-version] FAIL ${error.message}\n`);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
