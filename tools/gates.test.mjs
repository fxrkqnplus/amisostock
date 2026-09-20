import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve, basename } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { check as arch } from './arch-check/index.mjs';
import { check as money } from './money-check/index.mjs';
import { check as freshness } from './freshness-check/index.mjs';
import { check as i18n } from './i18n-check/index.mjs';
import { check as contract } from './contract-check/index.mjs';
import { report } from './gate-support.mjs';

const roots = [];
function fixture(files) {
  const root = mkdtempSync(resolve(tmpdir(), 'amisostock-gates-'));
  roots.push(root);
  for (const [file, text] of Object.entries(files)) {
    const path = resolve(root, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
  return root;
}
afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) {
    if (
      dirname(root) !== resolve(tmpdir()) ||
      !basename(root).startsWith('amisostock-gates-')
    )
      throw new Error('Unsafe fixture cleanup');
    rmSync(root, { recursive: true, force: true });
  }
});
it('contract validates actual Zod schemas, rejects drift and reports absent schemas', async () => {
  const data = JSON.parse(
    readFileSync(
      new URL('./contract-check/canary.json', import.meta.url),
      'utf8',
    ),
  );
  expect(
    (await contract(fixture({ [data.path]: data.good }))).violations,
  ).toEqual([]);
  expect(
    (await contract(fixture({ [data.path]: data.bad }))).violations.length,
  ).toBe(1);
  expect(await contract(fixture({}))).toMatchObject({
    candidates: 0,
    files: [],
  });
  await expect(
    contract(
      fixture({
        [data.path]: 'export default () => ({ schema: {}, samples: [] });',
      }),
    ),
  ).rejects.toThrow('Zod schema');
});
it('scope distinguishes inspected source without candidates from uninspected domains', () => {
  const root = fixture({
    'packages/shared/src/index.ts': 'export const PACKAGE_NAME = "fixture";',
  });
  for (const check of [money, freshness])
    expect(check(root)).toMatchObject({ candidates: 0, violations: [] });
  const previous = process.exitCode;
  const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  try {
    report('fixture', { files: ['source.ts'], rules: 1, violations: ['bad'] });
    expect(process.exitCode).toBe(1);
    report('fixture', { files: [], rules: 1, candidates: 0, violations: [] });
    expect(process.exitCode).toBe(0);
    expect(stdout.mock.calls.flat().join('')).toContain('files=0');
  } finally {
    process.exitCode = previous;
  }
});
for (const gate of ['arch', 'money', 'freshness', 'i18n', 'contract']) {
  it(`${gate}: canary fails, restored clean fixture passes through CLI`, () => {
    const data = JSON.parse(
      readFileSync(
        new URL(`./${gate}-check/canary.json`, import.meta.url),
        'utf8',
      ),
    );
    const root = fixture({ ...data.extra, [data.path]: data.bad });
    for (const [direction, content, status] of [
      ['bad', data.bad, 1],
      ['good', data.good, 0],
    ]) {
      writeFileSync(resolve(root, data.path), content);
      const result = spawnSync(
        process.execPath,
        [resolve(`tools/${gate}-check/index.mjs`), root],
        { encoding: 'utf8' },
      );
      process.stdout.write(
        `[canary:${gate}:${direction}] exit=${result.status}\n${result.stdout}${result.stderr}`,
      );
      expect(result.status).toBe(status);
      expect(result.stdout).toContain(`[scope:${gate}]`);
    }
  });
}
it('money catches typed amounts, missing currency and float arithmetic', () => {
  for (const content of [
    'interface Money { amount: number; currency: string }',
    'const fee = { amount: "12" };',
    'const price = 1; const total = price * 2;',
  ])
    expect(
      money(fixture({ 'packages/shared/src/input.ts': content })).violations
        .length,
    ).toBeGreaterThan(0);
});
it('i18n catches missing keys, unused keys, empty strings and invisibles independently', () => {
  for (const [translation, use, message] of [
    ['{}', 't("common:missing")', 'missing key'],
    ['{"unused":"Unused"}', '', 'unused key'],
    ['{"title":" "}', 't("common:title")', 'empty translation'],
    ['{"title":"Hidden\\u200b"}', 't("common:title")', 'invisible character'],
  ]) {
    const result = i18n(
      fixture({
        'apps/web/src/locales/tr/common.json': translation,
        'apps/web/src/index.ts': use,
      }),
    );
    expect(result.violations.join()).toContain(message);
  }
  expect(i18n(fixture({})).note).toContain('0 anahtar tarandı');
});
it('freshness follows identifiers into report calls and checks every missing field', () => {
  for (const missing of ['value', 'source', 'asOf', 'freshness']) {
    const fields = {
      value: 1,
      source: 'canary',
      asOf: '2026-09-20',
      freshness: 'live',
    };
    delete fields[missing];
    expect(
      freshness(
        fixture({
          'apps/api/src/report.ts': `const quote = ${JSON.stringify(fields)}; sendReport(quote);`,
        }),
      ).violations.join(),
    ).toContain(missing);
  }
  expect(
    freshness(
      fixture({
        'apps/api/src/report.ts':
          'const quote = { value: 1, source: "canary", asOf: "2026-09-20", freshness: "live" }; sendReport(quote);',
      }),
    ).violations,
  ).toEqual([]);
});
it('freshness verifies JSX values through their envelopes', () => {
  const data = JSON.parse(
    readFileSync(
      new URL('./freshness-check/canary.json', import.meta.url),
      'utf8',
    ),
  );
  expect(
    freshness(fixture({ [data.path]: data.bad })).violations.length,
  ).toBeGreaterThan(0);
  expect(freshness(fixture({ [data.path]: data.good })).violations).toEqual([]);
  expect(
    freshness(
      fixture({ [data.path]: 'export const view = <span>{12}</span>;' }),
    ).violations.length,
  ).toBe(1);
});
it.each([
  "export { x } from '@amisostock/data';",
  "const x = import('@amisostock/db');",
  "const x = require('node:fs');",
  'let state = 0;',
  'const cache = new Map();',
  'export const x = () => fetch("https://example.com");',
  'export const x = () => globalThis.cache;',
  'export const x = () => new Date();',
  'export const x = () => Math["random"]();',
])('engine rejects %s', (content) => {
  expect(
    arch(fixture({ 'packages/engine/src/index.ts': content })).violations
      .length,
  ).toBeGreaterThan(0);
});
it('checks relative imports and impure shared dependencies', () => {
  expect(
    arch(
      fixture({
        'apps/web/src/index.ts':
          "export { x } from '../../../packages/db/src/index';",
        'packages/db/src/index.ts': 'export const x = 1;',
      }),
    ).violations.join(),
  ).toContain('layer');
  expect(
    arch(
      fixture({
        'packages/engine/src/index.ts':
          "import { x } from '@amisostock/shared';",
        'packages/shared/src/index.ts': 'export const x = () => Date.now();',
      }),
    ).violations.join(),
  ).toContain('purity');
});
it('allows the documented layer directions and ignores text in comments', () => {
  expect(
    arch(
      fixture({
        'apps/api/src/index.ts': "import { x } from '@amisostock/db';",
        'packages/engine/src/index.ts':
          '// fetch(); Date.now();\nexport const x = (n: number) => n + 1;',
      }),
    ).violations,
  ).toEqual([]);
});
