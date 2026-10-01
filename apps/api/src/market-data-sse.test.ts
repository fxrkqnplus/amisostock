import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import {
  MARKET_QUOTE_CHANNEL,
  createQuote,
  parseMarketQuoteEvent,
} from '@amisostock/data';
import {
  basePath,
  parseCurrencyCode,
  parseSourceId,
  parseTicker,
} from '@amisostock/shared';
import {
  createMarketDataSseServer,
  type RedisMessageSubscriber,
} from './market-data-sse.js';

class FakeRedisSubscriber extends EventEmitter {
  subscribeCalls: string[] = [];

  async subscribe(channel: string): Promise<number> {
    this.subscribeCalls.push(channel);
    return 1;
  }

  async quit(): Promise<'OK'> {
    return 'OK';
  }
}

async function readUntil(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  token: string,
): Promise<string> {
  const decoder = new TextDecoder();
  let text = '';
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        while (!text.includes(token)) {
          const next = await reader.read();
          if (next.done) throw new Error(`SSE stream ended before ${token}`);
          text += decoder.decode(next.value, { stream: true });
        }
        return text;
      })(),
      new Promise<string>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`SSE stream timed out before ${token}`)),
          3_000,
        );
      }),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

describe('market-data SSE fan-out', () => {
  it('uses one Redis subscription to deliver a worker event to multiple clients', async () => {
    const redis = new FakeRedisSubscriber();
    const app = createMarketDataSseServer(
      redis as unknown as RedisMessageSubscriber,
    );
    const hubEvents: string[] = [];
    const unsubscribeHub = app.hub.subscribe((event) =>
      hubEvents.push(event.ticker),
    );
    const aborts = [new AbortController(), new AbortController()];
    const readers: ReadableStreamDefaultReader<Uint8Array>[] = [];
    try {
      await new Promise<void>((resolve, reject) => {
        app.server.once('error', reject);
        app.server.listen(0, '127.0.0.1', resolve);
      });
      const address = app.server.address();
      if (address === null || typeof address === 'string') {
        throw new Error('SSE server did not bind a TCP port');
      }
      const eventPath = basePath('/api/market-data/events', '/amisostock');
      const url = `http://127.0.0.1:${address.port}${eventPath}`;
      const [client1, client2] = await Promise.all(
        aborts.map((controller) => fetch(url, { signal: controller.signal })),
      );
      const reader1 = client1.body?.getReader();
      const reader2 = client2.body?.getReader();
      if (reader1 === undefined || reader2 === undefined) {
        throw new Error('SSE response body is missing');
      }
      readers.push(reader1, reader2);
      await Promise.all([
        readUntil(reader1, ': connected'),
        readUntil(reader2, ': connected'),
      ]);
      expect(redis.listenerCount('message')).toBe(1);
      const ticker = parseTicker('BTCUSDT');
      const source = parseSourceId('a412c229-7d68-46b6-8a79-208f119364c0');
      const event = {
        ticker,
        providerId: 'binance',
        attributionText: 'Piyasa verisi: Binance Spot.',
        quote: createQuote({
          ticker,
          source,
          currency: parseCurrencyCode('USDT'),
          asOf: new Date('2026-10-01T12:00:00.000Z'),
          freshness: 'live',
          price: '123.456789',
        }),
      };
      expect(() =>
        parseMarketQuoteEvent(JSON.parse(JSON.stringify(event)) as unknown),
      ).not.toThrow();
      redis.emit('message', MARKET_QUOTE_CHANNEL, JSON.stringify(event));
      expect(hubEvents).toEqual([ticker]);
      const [stream1, stream2] = await Promise.all([
        readUntil(reader1, 'event: quote'),
        readUntil(reader2, 'event: quote'),
      ]);
      expect(redis.subscribeCalls).toEqual([MARKET_QUOTE_CHANNEL]);
      expect(stream1).toContain('BTCUSDT');
      expect(stream2).toContain('BTCUSDT');
      expect(stream1).toContain('123.456789');
      expect(stream2).toContain('123.456789');
    } finally {
      unsubscribeHub();
      for (const abort of aborts) abort.abort();
      await Promise.all(
        readers.map((reader) => reader.cancel().catch(() => undefined)),
      );
      await app.close();
    }
  });
});
