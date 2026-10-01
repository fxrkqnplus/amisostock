import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import pino from 'pino';
import { startMarketDataSseServer } from './market-data-sse.js';

export const PACKAGE_NAME = '@amisostock/api' as const;

export * from './market-data-sse.js';

async function main(): Promise<void> {
  const app = await startMarketDataSseServer();
  const logger = pino({ level: process.env['LOG_LEVEL'] ?? 'info' });
  const close = async () => {
    await app.close();
  };
  process.once(
    'SIGINT',
    () => void close().catch(() => (process.exitCode = 1)),
  );
  process.once(
    'SIGTERM',
    () => void close().catch(() => (process.exitCode = 1)),
  );
  logger.info('Market-data API ready');
}

if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  void main().catch(() => {
    pino().fatal('Market-data API failed to start');
    process.exitCode = 1;
  });
}
