import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import {
  cli,
  filesIn,
  names,
  sources,
  syntax,
  ts,
  walk,
} from '../gate-support.mjs';

export function check(root) {
  const paths = sources(root);
  const localeFiles = filesIn(resolve(root, 'apps/web/src/locales/tr')).filter(
    (file) => file.endsWith('.json'),
  );
  const translations = new Map();
  const violations = [];
  const used = new Set();
  function flatten(value, prefix) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [key, child] of Object.entries(value))
        flatten(child, `${prefix}${prefix.endsWith(':') ? '' : '.'}${key}`);
      return;
    }
    translations.set(prefix, value);
    if (typeof value !== 'string' || !value.trim())
      violations.push(`i18n: empty translation ${prefix}`);
    if (
      /[\u00ad\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/u.test(
        `${prefix}${value}`,
      )
    )
      violations.push(`i18n: invisible character ${prefix}`);
  }
  for (const file of localeFiles)
    flatten(
      JSON.parse(readFileSync(file, 'utf8')),
      `${basename(file, '.json')}:`,
    );
  for (const file of paths)
    walk(syntax(file), (node) => {
      if (
        !ts.isCallExpression(node) ||
        !/^(?:t|i18n\.t)$/.test(node.expression.getText())
      )
        return;
      const argument = node.arguments[0];
      if (!argument || !ts.isStringLiteralLike(argument)) {
        violations.push(
          `i18n: unverifiable dynamic key in ${names(root, [file])[0]}`,
        );
        return;
      }
      used.add(argument.text);
      if (!translations.has(argument.text))
        violations.push(`i18n: missing key ${argument.text}`);
    });
  for (const key of translations.keys())
    if (!used.has(key)) violations.push(`i18n: unused key ${key}`);
  return {
    files: names(root, [...paths, ...localeFiles]),
    rules: 4,
    candidates: translations.size,
    violations,
    note: `${translations.size} anahtar tarandı; ${localeFiles.length ? `${localeFiles.length} yerel dosya` : 'yerel dosya bulunamadı; çeviri içeriklerine bakılmadı'}; kullanımlar=${used.size}`,
  };
}
await cli(import.meta, 'i18n', check);
