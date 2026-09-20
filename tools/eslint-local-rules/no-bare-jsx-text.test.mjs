import { Linter, RuleTester } from 'eslint';
import { describe, expect, it } from 'vitest';
import rule from './no-bare-jsx-text.mjs';
import tseslint from 'typescript-eslint';

it('executes JSX expression and attribute detection through the real TypeScript parser', () => {
  const linter = new Linter();
  const config = [
    {
      files: ['**/*.tsx'],
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      plugins: { local: { rules: { text: rule } } },
      rules: { 'local/text': 'error' },
    },
  ];
  const expressions = [
    '"Save"',
    '`Save ${name}`',
    'ok ? "Save" : t("x")',
    'ok && "Save"',
    'label || "Save"',
    '"Save" + name',
    '(track(), "Save")',
    '"Save" as string',
    '"Save" satisfies string',
    '"Save"!',
  ];
  for (const expression of expressions) {
    const messages = linter.verify(
      `const x = <span>{${expression}}</span>;`,
      config,
      { filename: 'canary.tsx' },
    );
    expect(messages.map((message) => message.messageId)).toEqual(['bareText']);
  }
  for (const jsx of [
    '<input type="submit" value="Save" />',
    '<input type={"button"} value="Save" />',
    '<Panel title={"Save"} />',
    '<span>Save</span>',
  ])
    expect(
      linter.verify(`const x = ${jsx};`, config, { filename: 'canary.tsx' })[0]
        ?.messageId,
    ).toBe('bareText');
  for (const jsx of [
    '<input value="id" />',
    '<Panel value="id" />',
    '<Panel.Item value="id" />',
    '<span title />',
    '<span>{t("x")}</span>',
    '<span>{/* comment */}</span>',
    '<span>{2 - 1}</span>',
    '<span>{`${name}`}</span>',
  ])
    expect(
      linter.verify(`const x = ${jsx};`, config, { filename: 'canary.tsx' }),
    ).toEqual([]);
});

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

const typedTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});
typedTester.run('no-bare-jsx-text TypeScript wrappers', rule, {
  valid: [
    {
      filename: 'view.tsx',
      code: 'const x = <span>{t("common:key") as string}</span>;',
    },
    { filename: 'view.tsx', code: 'const x = <Input.Field value="id" />;' },
    { filename: 'view.tsx', code: 'const x = <input disabled />;' },
    { filename: 'view.tsx', code: 'const x = <span>{2 - 1}</span>;' },
    { filename: 'view.tsx', code: 'const x = <span title />;' },
  ],
  invalid: [
    'const x = <span>{"Save" as string}</span>;',
    'const x = <span>{"Save" satisfies string}</span>;',
    'const x = <span>{"Save"!}</span>;',
  ].map((code) => ({
    filename: 'view.tsx',
    code,
    errors: [{ messageId: 'bareText' }],
  })),
});

tester.run('no-bare-jsx-text (K5)', rule, {
  valid: [
    'const button = <button>{t("common:save")}</button>;',
    'const input = <input placeholder={t("auth:email")} />;',
    'const button = <button aria-label={t("common:close")} />;',
    'const image = <img alt={t("brand:logo")} />;',
    'const element = <div className="panel" data-testid="panel" id="panel" />;',
    'const label = <span>{label}</span>;',
    'const element = <div>\n  {t("common:title")}\n</div>;',
    'const image = <img alt="" />;',
    'const element = <span>{" "}</span>;',
    'const element = <span>{/* translator-provided content */}</span>;',
    'const element = <span>{visible ? t("common:yes") : t("common:no")}</span>;',
    'const element = <span>{status === "ready" && t("common:ready")}</span>;',
    'const input = <input type="hidden" value="identifier" />;',
    'const input = <input type="submit" value={t("common:save")} />;',
    'const outsideJsx = "Kaydet";',
    'const element = <span>{`${label}`}</span>;',
  ],
  invalid: [
    {
      code: 'const button = <button>Kaydet</button>;',
      errors: [{ messageId: 'bareText' }],
    },
    {
      code: 'const link = <a>Giriş yap</a>;',
      errors: [{ messageId: 'bareText' }],
    },
    {
      code: 'const element = <>İşlem tamamlandı</>;',
      errors: [{ messageId: 'bareText' }],
    },
    {
      code: 'const element = <p>Save</p>;',
      errors: [{ messageId: 'bareText' }],
    },
    {
      code: 'const element = <p>{"Veri yok"}</p>;',
      errors: [{ messageId: 'bareText' }],
    },
    {
      code: 'const element = <p>{`Merhaba ${name}`}</p>;',
      errors: [{ messageId: 'bareText' }],
    },
    {
      code: 'const input = <input placeholder="E-posta" />;',
      errors: [{ messageId: 'bareText' }],
    },
    {
      code: 'const button = <button aria-label="Kapat" />;',
      errors: [{ messageId: 'bareText' }],
    },
    {
      code: 'const image = <img alt="Şirket logosu" />;',
      errors: [{ messageId: 'bareText' }],
    },
    {
      code: 'const element = <span title={"Ayrıntılar"} />;',
      errors: [{ messageId: 'bareText' }],
    },
    {
      code: 'const element = <Field label="Ad" />;',
      errors: [{ messageId: 'bareText' }],
    },
    {
      code: 'const element = <Field helperText={`En az ${min}`} />;',
      errors: [{ messageId: 'bareText' }],
    },
    {
      code: 'const element = <p>{ok ? "Başarılı" : "Başarısız"}</p>;',
      errors: [{ messageId: 'bareText' }, { messageId: 'bareText' }],
    },
    {
      code: 'const element = <p>{visible && "Hazır"}</p>;',
      errors: [{ messageId: 'bareText' }],
    },
    {
      code: 'const element = <p>{label || "Bilinmiyor"}</p>;',
      errors: [{ messageId: 'bareText' }],
    },
    {
      code: 'const element = <p>{label ?? "Bilinmiyor"}</p>;',
      errors: [{ messageId: 'bareText' }],
    },
    {
      code: 'const element = <p>{"Merhaba " + name}</p>;',
      errors: [{ messageId: 'bareText' }],
    },
    {
      code: 'const element = <p>{(track(), "Kaydet")}</p>;',
      errors: [{ messageId: 'bareText' }],
    },
    {
      code: 'const input = <input type="submit" value="Gönder" />;',
      errors: [{ messageId: 'bareText' }],
    },
    {
      code: 'const input = <input type={"button"} value="Aç" />;',
      errors: [{ messageId: 'bareText' }],
    },
    {
      code: 'const element = <Panel children="Yükleniyor" />;',
      errors: [{ messageId: 'bareText' }],
    },
  ],
});
