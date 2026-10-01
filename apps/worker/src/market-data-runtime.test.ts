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
const FX_TICKER = parseTicker('USD/TRY');
const SOURCE_ID = parseSourceId('a412c229-7d68-46b6-8a79-208f119364c0');
const EVDS_SOURCE_ID = parseSourceId('b412c229-7d68-46b6-8a79-208f119364c0');
const OER_SOURCE_ID = parseSourceId('c412c229-7d68-46b6-8a79-208f119364c0');
const CACHE_KEY = 'amisostock:market:quote:v1:BTCUSDT';
const BINANCE_CACHE_KEY = 'amisostock:market:quote:v2:BTCUSDT:binance';

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

  del(key: string): this {
    this.actions.push(() => this.redis.values.delete(key));
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

  async set(key: string, value: string): Promise<'OK'> {
    this.values.set(key, value);
    return 'OK';
  }

  async del(key: string): Promise<number> {
    return Number(this.values.delete(key));
  }

  multi(): FakeRedisBatch {
    return new FakeRedisBatch(this);
  }
}

function makePipeline(
  redis: FakeRedis,
  registry = new ProviderRegistry(),
): MarketQuotePipeline {
  if (registry.providersFor(TICKER).length === 0) {
    registry.register(
      {
        id: parseProviderId('binance'),
        sourceId: SOURCE_ID,
        attributionText: 'Piyasa verisi: Binance Spot.',
        storagePolicy: 'database',
        capabilities: {
          classes: ['crypto'],
          live: true,
          delayMinutes: 0,
          timeframes: [],
          historyDays: 0,
        },
        supports: (ticker) => ticker === TICKER,
        getQuote: async () => cachedEvent().quote,
        getCandles: async () => [],
      },
      0,
    );
  }
  return new MarketQuotePipeline(
    redis as unknown as Redis,
    {
      upsertMarketQuote: async () => undefined,
      query: async () => undefined,
    },
    registry,
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

    const stored = JSON.parse(
      redis.values.get(BINANCE_CACHE_KEY) ?? 'null',
    ) as {
      quote: { price: { kind: string; data?: unknown } };
    };
    expect(stored.quote.price.kind).toBe('stale');
    expect(stored.quote.price).not.toHaveProperty('data');
    expect(redis.values.has(CACHE_KEY)).toBe(false);
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

  it('persists and publishes EVDS and Open Exchange Rates as separate estimates', async () => {
    const redis = new FakeRedis();
    const writes: Array<{ sourceId: string; freshness: string }> = [];
    const registry = new ProviderRegistry();
    const provider = (
      id: string,
      sourceId: typeof EVDS_SOURCE_ID | typeof OER_SOURCE_ID,
      freshness: 'close' | 'estimate',
      amount: string,
      ageMs: number,
    ) => ({
      id: parseProviderId(id),
      sourceId,
      attributionText: id,
      storagePolicy: 'database' as const,
      capabilities: {
        classes: ['fx'] as const,
        live: false,
        delayMinutes: 0,
        timeframes: [],
        historyDays: 0,
      },
      supports: (ticker: string) => ticker === FX_TICKER,
      getQuote: async () =>
        createQuote({
          ticker: FX_TICKER,
          source: sourceId,
          currency: parseCurrencyCode('TRY'),
          asOf: new Date(Date.now() - ageMs),
          freshness,
          price: amount,
        }),
      getCandles: async () => [],
    });
    registry.register(
      provider('tcmb-evds', EVDS_SOURCE_ID, 'close', '41.25', 86_400_000),
      0,
    );
    registry.register(
      provider(
        'open-exchange-rates',
        OER_SOURCE_ID,
        'estimate',
        '41.3',
        76 * 60_000,
      ),
      100,
    );
    const pipeline = new MarketQuotePipeline(
      redis as unknown as Redis,
      {
        upsertMarketQuote: async (write) => {
          writes.push({ sourceId: write.sourceId, freshness: write.freshness });
        },
        query: async () => undefined,
      },
      registry,
      new Map([
        [parseProviderId('tcmb-evds'), EVDS_SOURCE_ID],
        [parseProviderId('open-exchange-rates'), OER_SOURCE_ID],
      ]),
      new Map([[FX_TICKER, 'integration-asset-id']]),
      pino({ level: 'silent' }),
    );

    await pipeline.ingestFromProvider(FX_TICKER, parseProviderId('tcmb-evds'));
    await pipeline.ingestFromProvider(
      FX_TICKER,
      parseProviderId('open-exchange-rates'),
    );
    await pipeline.markStaleQuotes();

    const events = redis.publications.map(
      ({ message }) => JSON.parse(message) as MarketQuoteEvent,
    );
    expect(events.map((event) => event.providerId)).toEqual([
      'tcmb-evds',
      'open-exchange-rates',
      'open-exchange-rates',
    ]);
    expect(events[0]?.quote.price.kind).toBe('value');
    expect(events[1]?.quote.price.kind).toBe('value');
    expect(events[2]?.quote.price).toMatchObject({
      kind: 'stale',
      source: OER_SOURCE_ID,
    });
    expect(
      redis.values.has('amisostock:market:quote:v2:USD/TRY:tcmb-evds'),
    ).toBe(true);
    expect(
      redis.values.has(
        'amisostock:market:quote:v2:USD/TRY:open-exchange-rates',
      ),
    ).toBe(true);
    expect(writes).toEqual([
      { sourceId: EVDS_SOURCE_ID, freshness: 'close' },
      { sourceId: OER_SOURCE_ID, freshness: 'estimate' },
    ]);
  });
});
