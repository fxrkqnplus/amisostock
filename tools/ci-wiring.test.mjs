import { readFileSync } from 'node:fs';
import { parsers } from 'prettier/plugins/yaml';
import { expect, it } from 'vitest';

const workflow = readFileSync(
  new URL('../.github/workflows/ci.yml', import.meta.url),
  'utf8',
);
const { scripts } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);
const required = [
  ...new Set([
    'typecheck',
    'lint',
    'test',
    'build',
    ...Object.keys(scripts).filter((name) => name.endsWith(':check')),
  ]),
];

// Use the already installed YAML parser, not line matching that could accept comments.
function decode(node) {
  if (!node) return null;
  if (node.anchor || node.tag || node.type === 'alias')
    throw new Error('Unsupported YAML indirection');
  if (node.type === 'mapping')
    return Object.fromEntries(
      node.children.map((item) => item.children.map(decode)),
    );
  if (node.type === 'sequence') return node.children.map(decode);
  if ('value' in node) return node.value;
  return decode(node.children?.[0]);
}
function validate(text) {
  const ast = parsers.yaml.parse(text);
  const document = ast.children[0];
  const config = decode(
    document.children.find((node) => node.type === 'documentBody'),
  );
  const job = config.jobs.checks;
  expect(job.strategy.matrix.include).toEqual([
    { arch: 'amd64', runner: 'ubuntu-24.04' },
    { arch: 'arm64', runner: 'ubuntu-24.04-arm' },
  ]);
  expect(job).toBeDefined();
  expect(job).not.toHaveProperty('if');
  expect(job).not.toHaveProperty('continue-on-error');
  expect(job).not.toHaveProperty('defaults');
  expect(config).not.toHaveProperty('defaults');
  const commands = [];
  for (const step of job.steps) {
    expect(step).not.toHaveProperty('if');
    expect(step).not.toHaveProperty('continue-on-error');
    expect(step).not.toHaveProperty('shell');
    if (step.run) commands.push(step.run.trim());
  }
  expect(commands).toContain('pnpm install --frozen-lockfile');
  for (const name of required) expect(commands).toContain(`pnpm ${name}`);
  return commands;
}
it('every check script and the full gate chain run unmasked in CI', () => {
  expect(validate(workflow)).toHaveLength(required.length + 1);
});
it.each([
  (text) =>
    text.replace('run: pnpm arch:check', 'run: pnpm arch:check || true'),
  (text) => text.replace('run: pnpm money:check', 'name: pnpm money:check'),
  (text) =>
    text.replace('run: pnpm freshness:check', 'run: echo pnpm freshness:check'),
  (text) => text.replace('checks:\n', 'checks:\n    if: false\n'),
  (text) =>
    text.replace(
      'run: pnpm test',
      'run: pnpm test\n        continue-on-error: true',
    ),
  (text) => text.replace('run: pnpm lint', 'run: pnpm lint\n        if: false'),
  (text) =>
    text.replace('run: pnpm build', 'run: pnpm build\n        shell: bash {0}'),
])('rejects masked, conditional or missing gate wiring (%#)', (mutate) => {
  expect(() => validate(mutate(workflow))).toThrow();
});
