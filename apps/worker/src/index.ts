import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import pino from 'pino';
import {
  parseMarketDataWorkerEnvironment,
  startMarketDataWorker,
} from './market-data-runtime.js';

export const PACKAGE_NAME = '@amisostock/worker' as const;

export * from './market-data-runtime.js';
export * from './provider-rate-limit.js';

async function main(): Promise<void> {
  const environment = parseMarketDataWorkerEnvironment(process.env);
  const logger = pino({ level: environment.LOG_LEVEL });
  const runtime = await startMarketDataWorker(environment, logger);
  const close = () =>
    void runtime.close().catch(() => {
      logger.error('Market-data worker shutdown failed');
      process.exitCode = 1;
    });
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}

if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  void main().catch(() => {
    pino().fatal('Market-data worker failed to start');
    process.exitCode = 1;
  });
}
