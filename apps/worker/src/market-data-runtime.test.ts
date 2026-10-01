import { describe, expect, it } from 'vitest';
import pino from 'pino';
import { createQuote, type MarketQuoteEvent } from '@amisostock/data';
import {
  parseCurrencyCode,
  parseProviderId,
  parseSourceId,
  parseTicker,
} from '@amisostock/shared';
import type { Redis } from 'ioredis';
import { ProviderRegistry } from '@amisostock/data';
import { MarketQuotePipeline } from './market-data-runtime.js';

const TICKER = parseTicker('BTCUSDT');
const SOURCE_ID = parseSourceId('a412c229-7d68-46b6-8a79-208f119364c0');
const CACHE_KEY = 'amisostock:market:quote:v1:BTCUSDT';

class FakeRedisBatch {
  private readonly actions: Array<() => void> = [];

  constructor(private readonly redis: FakeRedis) {}

  set(key: string, value: string): this {
    this.actions.push(() => this.redis.values.set(key, value));
    return this;
  }

  publish(channel: string, message: string): this {
    this.actions.push(() => this.redis.publications.push({ channel, message }));
    return this;
  }

  async exec(): Promise<unknown[]> {
    for (const action of this.actions) action();
    return [];
  }
}

class FakeRedis {
  readonly values = new Map<string, string>();
  readonly publications: Array<Readonly<{ channel: string; message: string }>> =
    [];

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async del(key: string): Promise<number> {
    return Number(this.values.delete(key));
  }

  multi(): FakeRedisBatch {
    return new FakeRedisBatch(this);
  }
}

function makePipeline(redis: FakeRedis): MarketQuotePipeline {
  return new MarketQuotePipeline(
    redis as unknown as Redis,
    {
      upsertMarketQuote: async () => undefined,
      query: async () => undefined,
    },
    new ProviderRegistry(),
    new Map(),
    new Map(),
    pino({ level: 'silent' }),
  );
}

function cachedEvent(): MarketQuoteEvent {
  return {
    ticker: TICKER,
    providerId: parseProviderId('binance'),
    attributionText: 'Piyasa verisi: Binance Spot.',
    quote: createQuote({
      ticker: TICKER,
      source: SOURCE_ID,
      currency: parseCurrencyCode('USDT'),
      asOf: new Date(Date.now() - 60_000),
      freshness: 'live',
      price: '65000.125',
    }),
  };
}

describe('market quote cache hydration', () => {
  it('marks an old cached quote stale after worker restart and publishes it once', async () => {
    const redis = new FakeRedis();
    redis.values.set(CACHE_KEY, JSON.stringify(cachedEvent()));
    const pipeline = makePipeline(redis);

    await pipeline.hydrateCachedEvents([TICKER]);
    await pipeline.markStaleQuotes();
    await pipeline.markStaleQuotes();

    const stored = JSON.parse(redis.values.get(CACHE_KEY) ?? 'null') as {
      quote: { price: { kind: string; data?: unknown } };
    };
    expect(stored.quote.price.kind).toBe('stale');
    expect(stored.quote.price).not.toHaveProperty('data');
    expect(redis.publications).toHaveLength(1);
  });

  it('discards an invalid cached event instead of restoring a partial quote', async () => {
    const redis = new FakeRedis();
    redis.values.set(CACHE_KEY, JSON.stringify({ ticker: TICKER, quote: {} }));
    const pipeline = makePipeline(redis);

    await pipeline.hydrateCachedEvents([TICKER]);

    expect(redis.values.has(CACHE_KEY)).toBe(false);
    expect(redis.publications).toHaveLength(0);
  });
});
