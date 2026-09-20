import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { checkEnvFiles } from './check-env-file.mjs';

const temporaryDirectories = [];
const temporaryRoot = resolve(tmpdir());
const command = fileURLToPath(new URL('./check-env-file.mjs', import.meta.url));

function fixture(files) {
  const directory = mkdtempSync(join(temporaryRoot, 'amisostock-env-gate-'));
  temporaryDirectories.push(directory);
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(directory, name), content);
  }
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    const target = resolve(directory);
    if (
      dirname(target) !== temporaryRoot ||
      !basename(target).startsWith('amisostock-env-gate-')
    ) {
      throw new Error(
        'Refusing to remove a directory outside the test fixture root',
      );
    }
    rmSync(target, { recursive: true, force: true });
  }
});

describe('environment file gate', () => {
  it('passes a clean example and reports the absent optional local file', () => {
    const directory = fixture({ '.env.example': 'SERVER_MODE=private\n' });
    expect(checkEnvFiles(directory)).toEqual({
      inspected: ['.env.example'],
      missing: ['.env'],
      violations: [],
    });
    const result = spawnSync(process.execPath, [command], {
      cwd: directory,
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      'files=1, rules=2, missing=1, violations=0',
    );
  });

  it.each(['.env', '.env.example'])(
    'fails an actual NODE_ENV assignment in %s',
    (file) => {
      const directory = fixture({
        '.env.example': 'SERVER_MODE=private\n',
        [file]: 'NODE_ENV=production\n',
      });
      expect(checkEnvFiles(directory).violations).toEqual([file]);
      const result = spawnSync(process.execPath, [command], {
        cwd: directory,
        encoding: 'utf8',
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(file);
      expect(result.stdout).toContain('violations=1');
    },
  );

  it('catches export syntax and whitespace', () => {
    const directory = fixture({
      '.env.example': '  export NODE_ENV = "production"\n',
    });
    expect(checkEnvFiles(directory).violations).toEqual(['.env.example']);
  });

  it('allows comments, other values and similarly named variables', () => {
    const directory = fixture({
      '.env': '# NODE_ENV=production\nCUSTOM_NODE_ENV=production\n',
      '.env.example': 'DESCRIPTION="NODE_ENV=production"\n',
    });
    expect(checkEnvFiles(directory)).toEqual({
      inspected: ['.env', '.env.example'],
      missing: [],
      violations: [],
    });
  });

  it('fails when no environment template was inspected', () => {
    const directory = fixture({});
    const result = spawnSync(process.execPath, [command], {
      cwd: directory,
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'files=0, rules=2, missing=2, violations=0',
    );
    expect(result.stderr).toContain('Required environment template is missing');
  });
});
