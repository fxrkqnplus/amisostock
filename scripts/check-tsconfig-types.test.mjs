import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  checkTsconfigTypes,
  hasExplicitTypes,
  main,
} from './check-tsconfig-types.mjs';

const temporaryRoots = [];
const sourceScript = fileURLToPath(
  new URL('./check-tsconfig-types.mjs', import.meta.url),
);
const initialExitCode = process.exitCode;

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'amisostock-tsconfig-types-'));
  temporaryRoots.push(root);
  for (const directory of ['apps', 'packages', 'scripts']) {
    mkdirSync(join(root, directory));
  }
  copyFileSync(sourceScript, join(root, 'scripts', 'check-tsconfig-types.mjs'));
  return root;
}

function addPackage(root, packagePath, config) {
  const packageRoot = join(root, packagePath);
  mkdirSync(packageRoot, { recursive: true });
  writeFileSync(join(packageRoot, 'package.json'), '{}');
  if (config !== undefined) {
    writeFileSync(join(packageRoot, 'tsconfig.json'), JSON.stringify(config));
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = initialExitCode;
  for (const root of temporaryRoots.splice(0)) {
    const resolved = resolve(root);
    if (
      !resolved.startsWith(
        `${resolve(tmpdir())}${sep}amisostock-tsconfig-types-`,
      )
    ) {
      throw new Error(
        `Refusing to remove an unexpected test directory: ${resolved}`,
      );
    }
    rmSync(resolved, { recursive: true, force: true });
  }
});

describe('explicit TypeScript types gate', () => {
  it.each([{ types: [] }, { types: ['node'] }, { types: ['node', 'react'] }])(
    'accepts an explicit array: $types',
    ({ types }) => {
      expect(hasExplicitTypes({ compilerOptions: { types } })).toBe(true);
    },
  );

  it.each([
    null,
    {},
    { compilerOptions: {} },
    { compilerOptions: { types: 'node' } },
    { compilerOptions: { types: [42] } },
  ])('rejects missing or invalid types: %j', (config) => {
    expect(hasExplicitTypes(config)).toBe(false);
  });

  it('lists every package in both workspaces and accepts explicitly empty types', () => {
    const root = fixture();
    addPackage(root, 'apps/web', { compilerOptions: { types: ['react'] } });
    addPackage(root, 'packages/shared', { compilerOptions: { types: [] } });
    expect(checkTsconfigTypes(root)).toEqual({
      files: ['apps/web/tsconfig.json', 'packages/shared/tsconfig.json'],
      errors: [],
    });
  });

  it('rejects inherited types when the package omits its own array', () => {
    const root = fixture();
    writeFileSync(
      join(root, 'tsconfig.base.json'),
      JSON.stringify({ compilerOptions: { types: ['node'] } }),
    );
    addPackage(root, 'apps/api', { extends: '../../tsconfig.base.json' });
    expect(checkTsconfigTypes(root).errors).toEqual([
      'apps/api/tsconfig.json: compilerOptions.types must be an explicit array of strings.',
    ]);
  });

  it('rejects a package without tsconfig.json', () => {
    const root = fixture();
    addPackage(root, 'packages/engine');
    expect(checkTsconfigTypes(root).errors).toEqual([
      'packages/engine/tsconfig.json: tsconfig.json is missing.',
    ]);
  });

  it('rejects invalid JSON and an empty workspace instead of reporting false success', () => {
    const root = fixture();
    expect(checkTsconfigTypes(root).errors).toContain(
      'No workspace packages were inspected.',
    );
    addPackage(root, 'apps/api', {});
    writeFileSync(join(root, 'apps/api/tsconfig.json'), '{');
    expect(checkTsconfigTypes(root).errors[0]).toContain(
      'cannot read valid JSON',
    );
  });

  it('reports absent workspace directories instead of treating them as inspected', () => {
    const root = join(fixture(), 'absent-workspace');
    expect(checkTsconfigTypes(root)).toEqual({
      files: [],
      errors: [
        'apps: workspace directory is missing.',
        'packages: workspace directory is missing.',
        'No workspace packages were inspected.',
      ],
    });
  });

  it('skips files and directories without manifests while sorting the inspected packages', () => {
    const root = fixture();
    writeFileSync(join(root, 'apps', 'notes.txt'), 'Workspace notes.');
    mkdirSync(join(root, 'apps', 'assets'));
    addPackage(root, 'apps/worker', { compilerOptions: { types: ['node'] } });
    addPackage(root, 'apps/api', { compilerOptions: { types: ['node'] } });

    expect(checkTsconfigTypes(root)).toEqual({
      files: ['apps/api/tsconfig.json', 'apps/worker/tsconfig.json'],
      errors: [],
    });
  });

  it('reports the package inventory and success through the command entry point', () => {
    const root = fixture();
    addPackage(root, 'apps/web', { compilerOptions: { types: ['react'] } });
    addPackage(root, 'packages/shared', { compilerOptions: { types: [] } });
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

    main(root);

    expect(stdout.mock.calls.flat().join('')).toBe(
      '[tsconfig-types] scope: files=2, rules=1 (explicit-types)\n' +
        '[tsconfig-types] file: apps/web/tsconfig.json\n' +
        '[tsconfig-types] file: packages/shared/tsconfig.json\n' +
        '[tsconfig-types] PASS packages=2, violations=0\n',
    );
    expect(stderr).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(initialExitCode);
  });

  it('reports every violated package and sets the command exit code', () => {
    const root = fixture();
    addPackage(root, 'apps/api', { compilerOptions: {} });
    addPackage(root, 'packages/engine');
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

    main(root);

    const output = stdout.mock.calls.flat().join('');
    expect(output).toContain('scope: files=2, rules=1 (explicit-types)');
    expect(output).toContain('file: apps/api/tsconfig.json');
    expect(output).toContain('file: packages/engine/tsconfig.json');
    expect(output).not.toContain('PASS');
    expect(stderr.mock.calls.flat().join('')).toBe(
      '[tsconfig-types] FAIL apps/api/tsconfig.json: compilerOptions.types must be an explicit array of strings.\n' +
        '[tsconfig-types] FAIL packages/engine/tsconfig.json: tsconfig.json is missing.\n',
    );
    expect(process.exitCode).toBe(1);
  });

  it('CLI passes with a scope derived from package manifests', () => {
    const root = fixture();
    addPackage(root, 'apps/web', { compilerOptions: { types: ['react'] } });
    addPackage(root, 'packages/shared', { compilerOptions: { types: [] } });
    const result = spawnSync(
      process.execPath,
      [join(root, 'scripts/check-tsconfig-types.mjs')],
      {
        encoding: 'utf8',
        cwd: tmpdir(),
      },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('scope: files=2, rules=1 (explicit-types)');
    expect(result.stdout).toContain('file: apps/web/tsconfig.json');
    expect(result.stdout).toContain('file: packages/shared/tsconfig.json');
    expect(result.stdout).toContain('PASS packages=2, violations=0');
    expect(result.stderr).toBe('');
  });

  it('CLI exits 1 when compilerOptions.types is absent', () => {
    const root = fixture();
    addPackage(root, 'apps/api', { compilerOptions: {} });
    const result = spawnSync(
      process.execPath,
      [join(root, 'scripts/check-tsconfig-types.mjs')],
      {
        encoding: 'utf8',
      },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'compilerOptions.types must be an explicit array of strings',
    );
  });
});
