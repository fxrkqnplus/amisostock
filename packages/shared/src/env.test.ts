import { readFileSync } from 'node:fs';
import { parseEnv as parseEnvFile } from 'node:util';
import { describe, expect, it } from 'vitest';
import { envSchema, parseEnv } from './env.js';

const example = parseEnvFile(
  readFileSync(new URL('../../../.env.example', import.meta.url), 'utf8'),
);

// Infrastructure-only inputs exercise validation; they are not provider or product data.
function validEnvironment(): Record<string, string> {
  return {
    ...example,
    JWT_SECRET: 'a'.repeat(32),
    SETUP_TOKEN: 'b'.repeat(32),
    AI_PROVIDER: 'local',
  };
}

describe('environment schema', () => {
  it('covers exactly the documented example keys', () => {
    expect(Object.keys(envSchema.shape).sort()).toEqual(
      Object.keys(example).sort(),
    );
    expect(Object.hasOwn(example, 'NODE_ENV')).toBe(false);
  });

  it('accepts complete infrastructure input and converts numeric fields', () => {
    const environment = parseEnv(validEnvironment());
    expect(environment.API_PORT).toBe(3011);
    expect(environment.WEB_PORT).toBe(3010);
    expect(environment.AI_DAILY_REQUEST_CAP).toBe(200);
    expect(environment.AI_MONTHLY_BUDGET_USD).toBe(0);
  });

  it.each(Object.keys(example))('rejects an absent %s key', (key) => {
    const input = validEnvironment();
    delete input[key];
    expect(() => parseEnv(input)).toThrow(key);
  });

  it('accepts explicit blanks for unused service keys', () => {
    const environment = parseEnv(validEnvironment());
    expect(environment.RESEND_API_KEY).toBe('');
    expect(environment.EVDS_API_KEY).toBe('');
    expect(environment.KAP_API_KEY).toBe('');
    expect(environment.TURNSTILE_SECRET_KEY).toBe('');
    expect(environment.AI_API_KEY).toBe('');
  });

  it.each(['google', 'openai', 'anthropic'])(
    'requires a key for %s AI',
    (provider) => {
      expect(() =>
        parseEnv({ ...validEnvironment(), AI_PROVIDER: provider }),
      ).toThrow('AI_API_KEY');
      expect(() =>
        parseEnv({
          ...validEnvironment(),
          AI_PROVIDER: provider,
          AI_API_KEY: 'configured-key',
        }),
      ).not.toThrow();
    },
  );

  it.each(['JWT_SECRET', 'SETUP_TOKEN'])(
    'rejects a short or placeholder %s',
    (key) => {
      for (const value of [
        'short',
        '<replace with a random secret of at least 32 characters>',
      ]) {
        expect(() => parseEnv({ ...validEnvironment(), [key]: value })).toThrow(
          key,
        );
      }
    },
  );

  it('rejects the unchanged example without disclosing its secret placeholders', () => {
    expect(() => parseEnv(example)).toThrow('JWT_SECRET');
    expect(() => parseEnv(example)).not.toThrow(example.JWT_SECRET);
  });

  it.each([
    ['API_PORT', '0'],
    ['WEB_PORT', '65536'],
    ['API_PORT', '3011.5'],
    ['DATABASE_URL', 'https://example.com'],
    ['DATABASE_URL', 'invalid-url-with-sensitive-value'],
    ['REDIS_URL', 'https://example.com'],
    ['PUBLIC_URL', 'ftp://example.com'],
    ['PUBLIC_BASE_PATH', 'relative-path'],
    ['JWT_ACCESS_TTL', '0m'],
    ['JWT_REFRESH_TTL', 'forever'],
    ['AI_DAILY_REQUEST_CAP', '0'],
    ['AI_MONTHLY_BUDGET_USD', '-1'],
    ['AI_MONTHLY_BUDGET_USD', ''],
    ['SERVER_MODE', 'unknown'],
    ['AI_PROVIDER', 'unknown'],
    ['EMAIL_FROM', 'not-an-email'],
    ['LOG_LEVEL', 'unknown'],
    ['RESEND_API_KEY', '<replace-me>'],
  ])('rejects invalid %s input', (key, value) => {
    expect(() => parseEnv({ ...validEnvironment(), [key]: value })).toThrow(
      key,
    );
  });

  it.each(['TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY'])(
    'rejects an unpaired %s',
    (key) => {
      expect(() =>
        parseEnv({ ...validEnvironment(), [key]: 'configured-key' }),
      ).toThrow('TURNSTILE_');
    },
  );

  it('accepts a configured Turnstile pair', () => {
    expect(() =>
      parseEnv({
        ...validEnvironment(),
        TURNSTILE_SITE_KEY: 'configured-site',
        TURNSTILE_SECRET_KEY: 'configured-secret',
      }),
    ).not.toThrow();
  });

  it('never includes rejected values in the error message', () => {
    const rejectedSecret = 'sensitive-short-value';
    expect(() =>
      parseEnv({ ...validEnvironment(), JWT_SECRET: rejectedSecret }),
    ).not.toThrow(rejectedSecret);
    expect(() =>
      parseEnv({ ...validEnvironment(), JWT_SECRET: rejectedSecret }),
    ).toThrow('JWT_SECRET');
  });

  it('rejects a missing environment object', () => {
    expect(() => parseEnv(undefined)).toThrow();
  });
});
