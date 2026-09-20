import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import rule from './no-bare-jsx-text.mjs';

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
