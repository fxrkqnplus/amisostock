import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'scripts/**/*.test.mjs',
      'tools/**/*.test.mjs',
      'packages/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      include: [
        'scripts/check-node-version.mjs',
        'scripts/check-tsconfig-types.mjs',
        'scripts/check-env-file.mjs',
        'tools/eslint-local-rules/no-*.mjs',
        'packages/shared/src/env.ts',
      ],
      exclude: ['**/*.test.*'],
      reporter: ['text', 'json-summary'],
      thresholds: { lines: 70, statements: 70, functions: 70, branches: 70 },
    },
  },
});
