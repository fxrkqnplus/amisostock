import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import local from './tools/eslint-local-rules/index.mjs';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/coverage/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { local },
    rules: {
      'no-console': 'error',
      'local/no-hardcoded-path': 'error',
      'local/no-bare-jsx-text': 'error',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    extends: [tseslint.configs.disableTypeChecked],
    rules: {
      'local/no-hardcoded-path': 'off',
      'local/no-bare-jsx-text': 'off',
    },
  },
);
