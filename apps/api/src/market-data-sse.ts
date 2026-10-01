import { createServer, type Server, type ServerResponse } from 'node:http';
import { MARKET_QUOTE_CHANNEL, parseMarketQuoteEvent } from '@amisostock/data';
import { basePath, parseTicker } from '@amisostock/shared';
import { Redis } from 'ioredis';
import pino, { type Logger } from 'pino';

export type RedisMessageSubscriber = Pick<Redis, 'on' | 'subscribe' | 'quit'>;

type MarketEventListener = (
  event: ReturnType<typeof parseMarketQuoteEvent>,
) => void;

export class MarketSseHub {
  private readonly listeners = new Set<
    Readonly<{
      ticker: string | undefined;
      listener: MarketEventListener;
    }>
  >();
  private readonly onMessage = (channel: string, message: string): void => {
    if (channel !== MARKET_QUOTE_CHANNEL) return;
    let event: ReturnType<typeof parseMarketQuoteEvent>;
    try {
      event = parseMarketQuoteEvent(JSON.parse(message) as unknown);
    } catch {
      this.logger.warn({ channel }, 'Rejected invalid Redis market event');
      return;
    }
    for (const subscription of this.listeners) {
      if (
        subscription.ticker === undefined ||
        subscription.ticker === event.ticker
      ) {
        subscription.listener(event);
      }
    }
  };

  constructor(
    private readonly subscriber: RedisMessageSubscriber,
    private readonly logger: Logger = pino({ level: 'silent' }),
  ) {
    this.subscriber.on('message', this.onMessage);
    void this.subscriber.subscribe(MARKET_QUOTE_CHANNEL).catch(() => {
      this.logger.error(
        { channel: MARKET_QUOTE_CHANNEL },
        'Redis subscription failed',
      );
    });
  }

  subscribe(listener: MarketEventListener, ticker?: string): () => void {
    const subscription = {
      ticker: ticker === undefined ? undefined : parseTicker(ticker),
      listener,
    };
    this.listeners.add(subscription);
    return () => this.listeners.delete(subscription);
  }

  async close(): Promise<void> {
    this.listeners.clear();
    await this.subscriber.quit();
  }
}

function writeQuoteEvent(
  response: ServerResponse,
  event: ReturnType<typeof parseMarketQuoteEvent>,
): void {
  response.write(`event: quote\ndata: ${JSON.stringify(event)}\n\n`);
}

export function createMarketDataSseServer(
  subscriber: RedisMessageSubscriber,
  logger: Logger = pino({ level: 'silent' }),
  publicBasePath = process.env['PUBLIC_BASE_PATH'] ??
    basePath('/amisostock', ''),
): Readonly<{
  hub: MarketSseHub;
  server: Server;
  close: () => Promise<void>;
}> {
  const hub = new MarketSseHub(subscriber, logger);
  const marketEventsPath = basePath('/api/market-data/events', publicBasePath);
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '', 'http://localhost');
    if (url.pathname !== marketEventsPath) {
      response.writeHead(404).end();
      return;
    }
    if (request.method !== 'GET') {
      response.writeHead(405, { Allow: 'GET' }).end();
      return;
    }
    const ticker = url.searchParams.get('ticker') ?? undefined;
    if (ticker !== undefined) {
      try {
        parseTicker(ticker);
      } catch {
        response.writeHead(400).end();
        return;
      }
    }

    response.writeHead(200, {
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream; charset=utf-8',
      'X-Accel-Buffering': 'no',
    });
    response.write(': connected\n\n');
    const unsubscribe = hub.subscribe(
      (event) => writeQuoteEvent(response, event),
      ticker,
    );
    const heartbeat = setInterval(
      () => response.write(': heartbeat\n\n'),
      15_000,
    );
    heartbeat.unref?.();
    response.once('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });
  return {
    hub,
    server,
    close: async () => {
      if (server.listening) {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
          server.closeAllConnections();
        });
      }
      await hub.close();
    },
  };
}

export async function startMarketDataSseServer(
  redisUrl = process.env['REDIS_URL'],
  portInput = process.env['API_PORT'] ?? '3011',
  logger: Logger = pino({ level: process.env['LOG_LEVEL'] ?? 'info' }),
): Promise<Readonly<{ close: () => Promise<void>; server: Server }>> {
  if (redisUrl === undefined || !/^rediss?:\/\//.test(redisUrl)) {
    throw new Error('REDIS_URL must be configured for the market-data API');
  }
  const port = Number(portInput);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('API_PORT must be a valid TCP port');
  }
  const subscriber = new Redis(redisUrl, { maxRetriesPerRequest: null });
  const app = createMarketDataSseServer(subscriber, logger);
  await new Promise<void>((resolve, reject) => {
    app.server.once('error', reject);
    app.server.listen(port, '0.0.0.0', resolve);
  });
  logger.info({ port }, 'Market-data SSE API listening');
  return app;
}
