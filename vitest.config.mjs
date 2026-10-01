import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 20000,
    include: [
      'scripts/**/*.test.mjs',
      'tools/**/*.test.mjs',
      'packages/**/*.test.ts',
      'apps/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      include: [
        'scripts/check-node-version.mjs',
        'scripts/check-tsconfig-types.mjs',
        'scripts/check-env-file.mjs',
        'tools/eslint-local-rules/no-*.mjs',
        'tools/*-check/index.mjs',
        'tools/gate-support.mjs',
        'packages/shared/src/env.ts',
        'packages/shared/src/identifiers.ts',
        'packages/shared/src/money.ts',
        'packages/shared/src/market-data.ts',
      ],
      exclude: ['**/*.test.*'],
      reporter: ['text', 'json-summary'],
      thresholds: {
        lines: 70,
        statements: 70,
        functions: 70,
        branches: 70,
        'scripts/check-env-file.mjs': { lines: 80 },
        'tools/eslint-local-rules/no-bare-jsx-text.mjs': { lines: 80 },
        'packages/shared/src/identifiers.ts': {
          lines: 85,
          statements: 85,
          functions: 85,
          branches: 85,
        },
        'packages/shared/src/money.ts': {
          lines: 85,
          statements: 85,
          functions: 85,
          branches: 85,
        },
        'packages/shared/src/market-data.ts': {
          lines: 85,
          statements: 85,
          functions: 85,
          branches: 85,
        },
      },
    },
  },
});
