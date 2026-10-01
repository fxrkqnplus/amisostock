import { Decimal } from 'decimal.js';
import {
  parseCurrencyCode,
  parseIsoCurrency,
  parseProviderId,
  parseSourceId,
  parseTicker,
} from '@amisostock/shared';
import { describe, expect, it, vi } from 'vitest';
import {
  BinanceSpotProvider,
  CoinGeckoProvider,
  EvdsProvider,
  OpenExchangeRatesProvider,
  ProviderError,
  ProviderRegistry,
  createQuote,
  parseExactJson,
  staleQuote,
  type BinanceSocket,
  type ProviderInstrument,
} from './index.js';

const BINANCE_SOURCE = parseSourceId('a412c229-7d68-46b6-8a79-208f119364c0');
const GECKO_SOURCE = parseSourceId('b412c229-7d68-46b6-8a79-208f119364c0');
const EVDS_SOURCE = parseSourceId('c412c229-7d68-46b6-8a79-208f119364c0');
const OER_SOURCE = parseSourceId('d412c229-7d68-46b6-8a79-208f119364c0');
const BTC: ProviderInstrument = {
  ticker: parseTicker('BTCUSDT'),
  assetClass: 'crypto',
  currency: parseCurrencyCode('USDT'),
  providerSymbol: 'BTCUSDT',
};
const USDTRY: ProviderInstrument = {
  ticker: parseTicker('USD/TRY'),
  assetClass: 'fx',
  currency: parseIsoCurrency('TRY'),
  providerSymbol: 'TP.DK.USD.S.YTL',
};
const EURTRY: ProviderInstrument = {
  ticker: parseTicker('EUR/TRY'),
  assetClass: 'fx',
  currency: parseIsoCurrency('TRY'),
  providerSymbol: 'EUR/TRY',
};
const OER_USDTRY: ProviderInstrument = {
  ...USDTRY,
  providerSymbol: 'USD/TRY',
};

class FakeSocket implements BinanceSocket {
  readonly listeners = new Map<string, (event: unknown) => void>();
  closed = false;

  addEventListener(type: string, listener: (event: unknown) => void): void {
    this.listeners.set(type, listener);
  }

  close(): void {
    this.closed = true;
    this.listeners.get('close')?.({});
  }

  send(data: string): void {
    this.listeners.get('message')?.({ data });
  }
}

function quote(
  source: typeof BINANCE_SOURCE,
  ticker = BTC.ticker,
  amount = '100',
) {
  return createQuote({
    ticker,
    source,
    currency: parseCurrencyCode('USDT'),
    asOf: new Date('2026-10-01T10:00:00.000Z'),
    freshness: 'live',
    price: amount,
  });
}

describe('provider normalization and contracts', () => {
  it('preserves exact JSON decimal tokens and expands scientific notation', () => {
    expect(
      parseExactJson('{"price":9007199254740993,"tiny":5.25e-8,"s":"1.2"}'),
    ).toEqual({
      price: '9007199254740993',
      tiny: '0.0000000525',
      s: '1.2',
    });
  });

  it('converts quotes through the shared Zod contract without float arithmetic', () => {
    const result = quote(BINANCE_SOURCE);
    expect(result.price.kind).toBe('value');
    if (result.price.kind === 'value') {
      expect(result.price.data.value.amount).toBeInstanceOf(Decimal);
      expect(result.price.data.value.amount.toString()).toBe('100');
    }
  });

  it('replaces every numeric datum with stale metadata when stale', () => {
    const original = quote(BINANCE_SOURCE);
    const stale = staleQuote(original);
    expect(stale.price).toEqual({
      kind: 'stale',
      source: BINANCE_SOURCE,
      asOf: new Date('2026-10-01T10:00:00.000Z'),
    });
  });
});

describe('Binance Spot provider', () => {
  it('validates a WebSocket ticker and preserves its event timestamp', async () => {
    const socket = new FakeSocket();
    let openedUrl = '';
    const provider = new BinanceSpotProvider(BINANCE_SOURCE, [BTC], {
      socketFactory: (url) => {
        openedUrl = url;
        return socket;
      },
    });
    const ticks: string[] = [];
    const unsubscribe = provider.subscribe([BTC.ticker], (value) => {
      if (value.price.kind === 'value') {
        ticks.push(value.price.data.value.amount.toString());
      }
    });
    const eventTime = Date.now();
    socket.send(
      JSON.stringify({
        stream: 'btcusdt@ticker',
        data: {
          E: eventTime,
          s: 'BTCUSDT',
          p: '12.25',
          P: '1.225',
          c: '1000.5',
          h: '1010',
          l: '980',
          v: '12.5',
        },
      }),
    );
    const result = await provider.getQuote(BTC.ticker);
    expect(openedUrl).toContain('btcusdt@ticker');
    expect(ticks).toEqual(['1000.5']);
    expect(result.price.kind).toBe('value');
    if (result.price.kind === 'value') {
      expect(result.price.data.asOf.getTime()).toBe(eventTime);
      expect(result.price.data.freshness).toBe('live');
    }
    unsubscribe();
    expect(socket.closed).toBe(true);
  });

  it('raises ProviderError for malformed messages without caching a partial quote', async () => {
    const socket = new FakeSocket();
    const errors: ProviderError[] = [];
    const provider = new BinanceSpotProvider(BINANCE_SOURCE, [BTC], {
      socketFactory: () => socket,
      onError: (error) => errors.push(error),
    });
    const unsubscribe = provider.subscribe([BTC.ticker], () => undefined);
    socket.send('{"stream":"btcusdt@ticker","data":{"s":"BTCUSDT"}}');
    await expect(provider.getQuote(BTC.ticker)).rejects.toMatchObject({
      code: 'unavailable',
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]?.code).toBe('invalid-response');
    unsubscribe();
  });

  it('uses the configured fallback after the Binance WebSocket closes', async () => {
    const socket = new FakeSocket();
    const primary = new BinanceSpotProvider(BINANCE_SOURCE, [BTC], {
      socketFactory: () => socket,
    });
    const unsubscribe = primary.subscribe([BTC.ticker], () => undefined);
    const fallback = {
      id: parseProviderId('coingecko'),
      sourceId: GECKO_SOURCE,
      attributionText: 'Powered by CoinGecko',
      storagePolicy: 'redis-only' as const,
      capabilities: {
        classes: ['crypto'] as const,
        live: false,
        delayMinutes: 1,
        timeframes: [],
        historyDays: 0,
      },
      supports: () => true,
      getQuote: async () => quote(GECKO_SOURCE),
      getCandles: async () => [],
    };
    const registry = new ProviderRegistry();
    registry.register(primary, 0);
    registry.register(fallback, 10);
    socket.close();
    try {
      const selected = await registry.getQuote(BTC.ticker);
      expect(selected.providerId).toBe('coingecko');
      expect(selected.persist).toBe(false);
    } finally {
      unsubscribe();
      primary.close();
    }
  });
});

describe('CoinGecko Demo provider', () => {
  it('uses a server-side key, returns delayed values, and keeps exact decimals', async () => {
    const now = new Date('2026-10-01T10:00:10.000Z');
    let requestUrl = '';
    let apiKeyHeader = '';
    const fetcher: typeof fetch = async (input, init) => {
      requestUrl = String(input);
      const headers = new Headers(init?.headers);
      apiKeyHeader = headers.get('x-cg-demo-api-key') ?? '';
      return new Response(
        '[{"id":"bitcoin","current_price":67123.123456,"price_change_24h":12.123456,"price_change_percentage_24h":0.25,"high_24h":68000,"low_24h":66000,"total_volume":100.5,"last_updated":"2026-10-01T10:00:00.000Z"}]',
        { status: 200 },
      );
    };
    const provider = new CoinGeckoProvider(
      GECKO_SOURCE,
      [{ ...BTC, providerSymbol: 'bitcoin' }],
      'secret-server-key',
      { fetcher, now: () => now },
    );
    const result = await provider.getQuote(BTC.ticker);
    expect(requestUrl).not.toContain('secret-server-key');
    expect(apiKeyHeader).toBe('secret-server-key');
    expect(provider.storagePolicy).toBe('redis-only');
    expect(provider.attributionText).toBe('Powered by CoinGecko');
    expect(result.price.kind).toBe('value');
    if (result.price.kind === 'value') {
      expect(result.price.data.freshness).toBe('delayed');
      expect(result.price.data.asOf.toISOString()).toBe(
        '2026-10-01T10:00:00.000Z',
      );
      expect(result.price.data.value.amount.toString()).toBe('67123.123456');
    }
  });

  it('marks a response older than 30 seconds stale without exposing its value', async () => {
    const provider = new CoinGeckoProvider(
      GECKO_SOURCE,
      [{ ...BTC, providerSymbol: 'bitcoin' }],
      'server-key',
      {
        now: () => new Date('2026-10-01T10:00:31.000Z'),
        fetcher: async () =>
          new Response(
            '[{"id":"bitcoin","current_price":100,"price_change_24h":0,"price_change_percentage_24h":0,"high_24h":101,"low_24h":99,"total_volume":10,"last_updated":"2026-10-01T10:00:00.000Z"}]',
            { status: 200 },
          ),
      },
    );
    const result = await provider.getQuote(BTC.ticker);
    expect(result.price).toMatchObject({ kind: 'stale', source: GECKO_SOURCE });
  });

  it('converts HTTP 429 to a retry-after error without exposing response bodies', async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response('secret response body', {
          status: 429,
          headers: { 'retry-after': '12' },
        }),
    );
    const provider = new CoinGeckoProvider(
      GECKO_SOURCE,
      [{ ...BTC, providerSymbol: 'bitcoin' }],
      'server-key',
      { fetcher },
    );
    const error = await provider
      .getQuote(BTC.ticker)
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toMatchObject({ code: 'rate-limited', retryAfterMs: 12_000 });
    expect(String(error)).not.toContain('secret response body');
  });
});

describe('TCMB EVDS provider', () => {
  it('uses the EVDS key header and carries the observation date as close', async () => {
    let requestUrl = '';
    let apiKeyHeader = '';
    const provider = new EvdsProvider(EVDS_SOURCE, [USDTRY], 'evds-secret', {
      now: () => new Date('2026-10-01T09:00:00.000Z'),
      fetcher: async (input, init) => {
        requestUrl = String(input);
        apiKeyHeader = new Headers(init?.headers).get('key') ?? '';
        return new Response(
          '[{"Tarih":"30-09-2026","TP_DK_USD_S_YTL":41.2},{"Tarih":"01-10-2026","TP_DK_USD_S_YTL":41.35}]',
          { status: 200 },
        );
      },
    });
    const result = await provider.getQuote(USDTRY.ticker);
    expect(requestUrl).not.toContain('evds-secret');
    expect(apiKeyHeader).toBe('evds-secret');
    expect(provider.capabilities.live).toBe(false);
    expect(provider.attributionText).toContain('TCMB');
    expect(result.price.kind).toBe('value');
    if (result.price.kind === 'value') {
      expect(result.price.data.freshness).toBe('close');
      expect(result.price.data.asOf.toISOString()).toBe(
        '2026-10-01T00:00:00.000Z',
      );
      expect(result.price.data.value.amount.toString()).toBe('41.35');
    }
  });

  it('does not cache any series when one mapped observation is omitted', async () => {
    const euro: ProviderInstrument = {
      ...USDTRY,
      ticker: parseTicker('EUR/TRY'),
      providerSymbol: 'TP.DK.EUR.S.YTL',
    };
    const provider = new EvdsProvider(
      EVDS_SOURCE,
      [USDTRY, euro],
      'evds-secret',
      {
        fetcher: async () =>
          new Response('[{"Tarih":"01-10-2026","TP_DK_USD_S_YTL":41.35}]', {
            status: 200,
          }),
      },
    );
    await expect(provider.getQuote(USDTRY.ticker)).rejects.toMatchObject({
      code: 'invalid-response',
    });
    await expect(provider.getQuote(euro.ticker)).rejects.toMatchObject({
      code: 'invalid-response',
    });
  });

  it('preserves 429 backoff guidance', async () => {
    const provider = new EvdsProvider(EVDS_SOURCE, [USDTRY], 'evds-secret', {
      fetcher: async () =>
        new Response('', { status: 429, headers: { 'retry-after': '30' } }),
    });
    await expect(provider.getQuote(USDTRY.ticker)).rejects.toMatchObject({
      code: 'rate-limited',
      retryAfterMs: 30_000,
    });
  });
});

describe('Open Exchange Rates provider', () => {
  const asOf = new Date('2026-10-01T10:00:00.000Z');
  const response = (rates: Record<string, number>, timestamp = asOf) =>
    JSON.stringify({
      timestamp: Math.floor(timestamp.getTime() / 1_000),
      base: 'USD',
      rates,
    });

  it('keeps the USD-base response as separate attributed estimates', async () => {
    let requestUrl = '';
    let authorization = '';
    let requests = 0;
    const provider = new OpenExchangeRatesProvider(
      OER_SOURCE,
      [OER_USDTRY, EURTRY],
      'server-app-id',
      {
        now: () => new Date('2026-10-01T10:10:00.000Z'),
        fetcher: async (input, init) => {
          requests += 1;
          requestUrl = String(input);
          authorization = new Headers(init?.headers).get('authorization') ?? '';
          return new Response(response({ USD: 1, TRY: 41.2, EUR: 0.81345 }), {
            status: 200,
          });
        },
      },
    );

    await provider.refresh();
    const usdTry = await provider.getQuote(USDTRY.ticker);
    const eurTry = await provider.getQuote(EURTRY.ticker);
    expect(requests).toBe(1);
    expect(requestUrl).not.toContain('server-app-id');
    expect(new URL(requestUrl).searchParams.get('symbols')).toBe('EUR,TRY,USD');
    expect(authorization).toBe('Token server-app-id');
    expect(provider.attributionText).toContain('Open Exchange Rates');
    for (const [result, expected] of [
      [usdTry, '41.2'],
      [eurTry, '50.648473'],
    ] as const) {
      expect(result.price.kind).toBe('value');
      if (result.price.kind === 'value') {
        expect(result.price.data.value.amount.toString()).toBe(expected);
        expect(result.price.data.freshness).toBe('estimate');
        expect(result.price.data.asOf).toEqual(asOf);
      }
    }
  });

  it('rejects a response missing any mapped currency without caching a partial result', async () => {
    const provider = new OpenExchangeRatesProvider(
      OER_SOURCE,
      [OER_USDTRY, EURTRY],
      'server-app-id',
      {
        fetcher: async () =>
          new Response(response({ USD: 1, TRY: 41.2 }), { status: 200 }),
      },
    );

    await expect(provider.refresh()).rejects.toMatchObject({
      providerId: 'open-exchange-rates',
      code: 'invalid-response',
    });
    await expect(provider.getQuote(USDTRY.ticker)).rejects.toMatchObject({
      code: 'invalid-response',
    });
  });

  it('hides estimate values older than 75 minutes', async () => {
    const provider = new OpenExchangeRatesProvider(
      OER_SOURCE,
      [OER_USDTRY],
      'server-app-id',
      {
        now: () => new Date('2026-10-01T11:16:00.000Z'),
        fetcher: async () =>
          new Response(response({ USD: 1, TRY: 41.2 }), { status: 200 }),
      },
    );

    const result = await provider.getQuote(USDTRY.ticker);
    expect(result.price).toMatchObject({
      kind: 'stale',
      source: OER_SOURCE,
      asOf,
    });
    expect(result.price).not.toHaveProperty('data');
  });

  it('preserves 429 backoff guidance without exposing the response body or App ID', async () => {
    const provider = new OpenExchangeRatesProvider(
      OER_SOURCE,
      [OER_USDTRY],
      'secret-app-id',
      {
        fetcher: async () =>
          new Response('secret provider response', {
            status: 429,
            headers: { 'retry-after': '20' },
          }),
      },
    );
    const error = await provider
      .getQuote(USDTRY.ticker)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toMatchObject({
      code: 'rate-limited',
      retryAfterMs: 20_000,
    });
    expect(String(error)).not.toContain('secret provider response');
    expect(String(error)).not.toContain('secret-app-id');
  });
});

describe('provider registry', () => {
  function provider(
    id: string,
    sourceId: typeof BINANCE_SOURCE,
    get: () => Promise<unknown>,
  ) {
    return {
      id: parseProviderId(id),
      sourceId,
      attributionText: null,
      storagePolicy: 'database' as const,
      capabilities: {
        classes: ['crypto'] as const,
        live: true,
        delayMinutes: 0,
        timeframes: [],
        historyDays: 0,
      },
      supports: (ticker: string) => ticker === BTC.ticker,
      getQuote: get,
      getCandles: async () => [],
    };
  }

  it('uses the first available source and does not average values', async () => {
    const primary = provider('binance', BINANCE_SOURCE, async () => {
      throw new ProviderError(parseProviderId('binance'), 'down', {
        code: 'unavailable',
      });
    });
    const fallback = provider('coingecko', GECKO_SOURCE, async () =>
      quote(GECKO_SOURCE, BTC.ticker, '103'),
    );
    const registry = new ProviderRegistry();
    registry.register(fallback, 10);
    registry.register(primary, 0);
    const selected = await registry.getQuote(BTC.ticker);
    expect(selected.providerId).toBe('coingecko');
    expect(selected.quote.price.kind).toBe('value');
    if (selected.quote.price.kind === 'value') {
      expect(selected.quote.price.data.value.amount.toString()).toBe('103');
      expect(selected.quote.price.data.source).toBe(GECKO_SOURCE);
    }
  });

  it('does not hide a malformed primary response behind a fallback', async () => {
    const fallback = vi.fn(async () => quote(GECKO_SOURCE));
    const primary = provider('binance', BINANCE_SOURCE, async () => ({
      invalid: true,
    }));
    const registry = new ProviderRegistry();
    registry.register(primary, 0);
    registry.register(provider('coingecko', GECKO_SOURCE, fallback), 10);
    await expect(registry.getQuote(BTC.ticker)).rejects.toMatchObject({
      code: 'invalid-response',
    });
    expect(fallback).not.toHaveBeenCalled();
  });

  it('passes a stale fallback through as stale without numeric values', async () => {
    const stale = quote(GECKO_SOURCE);
    const registry = new ProviderRegistry();
    registry.register(
      provider('coingecko', GECKO_SOURCE, async () => staleQuote(stale)),
      10,
    );
    const selected = await registry.getQuote(BTC.ticker);
    expect(selected.providerId).toBe('coingecko');
    expect(selected.quote.price).toMatchObject({
      kind: 'stale',
      source: GECKO_SOURCE,
    });
  });
});
