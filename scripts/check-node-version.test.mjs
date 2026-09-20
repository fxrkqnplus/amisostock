import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { main, validateNodeVersion } from './check-node-version.mjs';

const temporaryRoots = [];
const sourceScript = fileURLToPath(
  new URL('./check-node-version.mjs', import.meta.url),
);
const initialExitCode = process.exitCode;

function fixture(version) {
  const root = mkdtempSync(join(tmpdir(), 'amisostock-node-version-'));
  temporaryRoots.push(root);
  mkdirSync(join(root, 'scripts'));
  const script = join(root, 'scripts', 'check-node-version.mjs');
  copyFileSync(sourceScript, script);
  if (version !== undefined) {
    writeFileSync(join(root, '.nvmrc'), `${version}\n`);
  }
  return script;
}

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = initialExitCode;
  for (const root of temporaryRoots.splice(0)) {
    const resolved = resolve(root);
    if (
      !resolved.startsWith(`${resolve(tmpdir())}${sep}amisostock-node-version-`)
    ) {
      throw new Error(
        `Refusing to remove an unexpected test directory: ${resolved}`,
      );
    }
    rmSync(resolved, { recursive: true, force: true });
  }
});

describe('exact Node version gate', () => {
  it('accepts the exact pinned runtime', () => {
    expect(() => validateNodeVersion('24.19.0', '24.19.0')).not.toThrow();
  });

  it.each(['24.18.0', '24.19.1', '25.0.0', '24.19.0-rc.1'])(
    'rejects a different runtime: %s',
    (actualVersion) => {
      expect(() => validateNodeVersion('24.19.0', actualVersion)).toThrow(
        'Node version mismatch',
      );
    },
  );

  it.each(['24', 'v24.19.0', '^24.19.0', '', '24.19.0\n25.0.0'])(
    'rejects a non-exact pin: %s',
    (requiredVersion) => {
      expect(() => validateNodeVersion(requiredVersion, '24.19.0')).toThrow(
        'one exact Node version',
      );
    },
  );

  it('reports the measured runtime and scope through the command entry point', () => {
    const root = dirname(dirname(fixture(process.versions.node)));
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

    main(root);

    expect(stdout.mock.calls.flat().join('')).toBe(
      '[node-version] scope: files=1, rules=1 (exact-node-version)\n' +
        '[node-version] files: .nvmrc\n' +
        `[node-version] PASS required=${process.versions.node}, actual=${process.versions.node}\n`,
    );
    expect(stderr).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(initialExitCode);
  });

  it.each([
    { version: '0.0.0', message: 'Node version mismatch' },
    { version: 'v24.19.0', message: 'one exact Node version' },
    { version: undefined, message: '.nvmrc' },
  ])(
    'reports a failed pin ($version) and sets the command exit code',
    ({ version, message }) => {
      const root = dirname(dirname(fixture(version)));
      const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
      const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

      main(root);

      const output = stdout.mock.calls.flat().join('');
      expect(output).toContain('scope: files=1, rules=1 (exact-node-version)');
      expect(output).not.toContain('PASS');
      expect(stderr.mock.calls.flat().join('')).toContain(
        `[node-version] FAIL`,
      );
      expect(stderr.mock.calls.flat().join('')).toContain(message);
      expect(process.exitCode).toBe(1);
    },
  );

  it('CLI passes and reports scope for the actual process runtime', () => {
    const result = spawnSync(
      process.execPath,
      [fixture(process.versions.node)],
      {
        encoding: 'utf8',
        cwd: tmpdir(),
      },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      'scope: files=1, rules=1 (exact-node-version)',
    );
    expect(result.stdout).toContain(`PASS required=${process.versions.node}`);
    expect(result.stderr).toBe('');
  });

  it('CLI exits 1 for a mismatched pin', () => {
    const result = spawnSync(process.execPath, [fixture('0.0.0')], {
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      `Node version mismatch: required=0.0.0, actual=${process.versions.node}`,
    );
  });

  it('CLI exits 1 if the pin file is absent', () => {
    const result = spawnSync(process.execPath, [fixture()], {
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('[node-version] FAIL');
    expect(result.stderr).toContain('.nvmrc');
  });
});
