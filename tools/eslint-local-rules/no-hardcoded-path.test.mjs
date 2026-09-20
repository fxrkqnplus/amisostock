import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import rule from './no-hardcoded-path.mjs';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

tester.run('no-hardcoded-path (K6)', rule, {
  valid: [
    "fetch(basePath('/api/prices'));",
    'const path = basePath(`/api/${symbol}`);',
    'const link = <a href={basePath("/giris")} />;',
    "fetch('https://example.com/api/prices');",
    'const image = <img src="//cdn.example.com/logo.svg" />;',
    "const relative = './settings';",
    "const hash = '#settings';",
    "const key = 'navigation:login';",
    'const matcher = /api/;',
    'const root = basePath("/");',
    'const value = 42;',
    'const path = `${basePath()}/api/prices`;',
  ],
  invalid: [
    { code: "fetch('/api/prices');", errors: [{ messageId: 'hardcodedPath' }] },
    {
      code: 'const path = "/giris";',
      errors: [{ messageId: 'hardcodedPath' }],
    },
    {
      code: 'const link = <a href="/giris" />;',
      errors: [{ messageId: 'hardcodedPath' }],
    },
    {
      code: 'const link = <a href={"/giris"} />;',
      errors: [{ messageId: 'hardcodedPath' }],
    },
    {
      code: 'fetch(`/api/${symbol}`);',
      errors: [{ messageId: 'hardcodedPath' }],
    },
    {
      code: 'const path = `/giris`;',
      errors: [{ messageId: 'hardcodedPath' }],
    },
    { code: 'const path = "/";', errors: [{ messageId: 'hardcodedPath' }] },
    {
      code: 'const path = "/api/" + symbol;',
      errors: [{ messageId: 'hardcodedPath' }],
    },
    {
      code: 'other.basePath("/api/prices");',
      errors: [{ messageId: 'hardcodedPath' }],
    },
    {
      code: 'basePath(transform("/api/prices"));',
      errors: [{ messageId: 'hardcodedPath' }],
    },
    {
      code: 'basePath(value, "/api/prices");',
      errors: [{ messageId: 'hardcodedPath' }],
    },
  ],
});
