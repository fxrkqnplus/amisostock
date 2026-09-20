import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { cli, filesIn, names } from '../gate-support.mjs';

// Reuse shared's pinned Zod dependency; no additional dependency or provider schema.
const require = createRequire(
  new URL('../../packages/shared/package.json', import.meta.url),
);
const { z } = require('zod');
export async function check(root) {
  const paths = filesIn(resolve(root, 'packages/data/contracts')).filter(
    (file) => file.endsWith('.contract.mjs'),
  );
  const violations = [];
  let candidates = 0;
  for (const path of paths) {
    const module = await import(pathToFileURL(path).href);
    const contract = module.default(z);
    if (
      !(contract.schema instanceof z.ZodType) ||
      !Array.isArray(contract.samples) ||
      !contract.samples.length
    )
      throw new Error(
        `Contract requires a Zod schema and nonempty samples: ${path}`,
      );
    for (const sample of contract.samples) {
      candidates++;
      const result = contract.schema.safeParse(sample);
      if (!result.success)
        violations.push(
          `contract: ${names(root, [path])[0]}: ${result.error.message}`,
        );
    }
  }
  return {
    files: names(root, paths),
    rules: 1,
    candidates,
    violations,
    note: paths.length
      ? 'sağlayıcı cevapları Zod şemasında sınandı'
      : '0 şema, 0 cevap; gerçek sağlayıcı sözleşmesine bakılmadı (2.1); iskelet kanaryayla sınanır',
  };
}
await cli(import.meta, 'contract', check);
