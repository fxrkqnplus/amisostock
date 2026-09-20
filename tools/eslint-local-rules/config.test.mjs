import { randomUUID } from 'node:crypto';
import { access, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));

async function lintCanary(code) {
  const file = resolve(
    projectRoot,
    'apps/web/src',
    `lint-canary-${randomUUID()}.tsx`,
  );
  await expect(access(file)).rejects.toMatchObject({ code: 'ENOENT' });
  await writeFile(file, code, { encoding: 'utf8', flag: 'wx' });

  try {
    const eslint = new ESLint({ cwd: projectRoot, cache: false });
    const results = await eslint.lintFiles([file]);
    expect(results).toHaveLength(1);
    return results[0];
  } finally {
    await unlink(file);
  }
}

describe('root ESLint flat config applies K5 and K6 to an actual app source file', () => {
  it('reports both configured rules for a known path and text violation', async () => {
    const result = await lintCanary(
      'export const link = <a href="/giris">Giriş yap</a>;',
    );

    expect(result.fatalErrorCount).toBe(0);
    expect(result.errorCount).toBe(2);
    expect(result.warningCount).toBe(0);
    expect(result.messages.map((message) => message.ruleId).sort()).toEqual([
      'local/no-bare-jsx-text',
      'local/no-hardcoded-path',
    ]);
    expect(result.messages.every((message) => message.severity === 2)).toBe(
      true,
    );
    process.stdout.write(
      `[scope:eslint-canary:violation] files=1 rules=2 errors=${result.errorCount} ruleIds=${result.messages
        .map((message) => message.ruleId)
        .sort()
        .join(',')}\n`,
    );
  }, 30_000);

  it('accepts basePath() and t() with no messages', async () => {
    const result = await lintCanary(`
declare function basePath(path: string): string;
declare function t(key: string): string;
export const link = <a href={basePath('/giris')}>{t('auth:login')}</a>;
`);

    expect(result.fatalErrorCount).toBe(0);
    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
    expect(result.messages).toEqual([]);
    process.stdout.write(
      `[scope:eslint-canary:clean] files=1 rules=2 errors=${result.errorCount} warnings=${result.warningCount}\n`,
    );
  }, 30_000);
});
