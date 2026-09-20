import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { pathToFileURL } from 'node:url';

const ENV_FILES = ['.env', '.env.example'];

export function checkEnvFiles(directory = process.cwd()) {
  const inspected = [];
  const missing = [];
  const violations = [];

  for (const file of ENV_FILES) {
    let content;
    try {
      content = readFileSync(resolve(directory, file), 'utf8');
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        missing.push(file);
        continue;
      }
      throw error;
    }
    inspected.push(file);
    if (Object.hasOwn(parseEnv(content), 'NODE_ENV')) {
      violations.push(file);
    }
  }

  return { inspected, missing, violations };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const result = checkEnvFiles();
  process.stdout.write(
    `Environment file gate: files=${result.inspected.length}, rules=2, missing=${result.missing.length}, violations=${result.violations.length}\n`,
  );
  process.stdout.write(
    'Rules: no NODE_ENV assignments; .env.example must be inspected\n',
  );
  process.stdout.write(
    `Inspected: ${result.inspected.join(', ') || '(none)'}\n`,
  );
  if (result.missing.length > 0) {
    process.stdout.write(`Missing: ${result.missing.join(', ')}\n`);
  }
  if (result.violations.length > 0) {
    process.stderr.write(
      `Remove NODE_ENV assignments from: ${result.violations.join(', ')}\n`,
    );
    process.exitCode = 1;
  }
  if (!result.inspected.includes('.env.example')) {
    process.stderr.write(
      'Required environment template is missing: .env.example\n',
    );
    process.exitCode = 1;
  }
}
