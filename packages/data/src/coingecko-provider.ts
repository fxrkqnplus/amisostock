import { Decimal } from 'decimal.js';
import {
  type ProviderId,
  type Quote,
  type SourceId,
  type Ticker,
} from '@amisostock/shared';
import { z } from 'zod';
import { ProviderError } from './provider-error.js';
import {
  createQuote,
  parseProviderInstrument,
  staleQuote,
  type Candle,
  type MarketDataProvider,
  type ProviderCapabilities,
  type ProviderInstrument,
} from './provider-contract.js';
import {
  decimalTextPattern,
  parseExactJson,
} from './provider-normalization.js';

const marketRowSchema = z
  .object({
    id: z.string().min(1),
    current_price: z.string().regex(decimalTextPattern),
    price_change_24h: z.string().regex(decimalTextPattern).nullable(),
    price_change_percentage_24h: z
      .string()
      .regex(decimalTextPattern)
      .nullable(),
    high_24h: z.string().regex(decimalTextPattern).nullable(),
    low_24h: z.string().regex(decimalTextPattern).nullable(),
    total_volume: z.string().regex(decimalTextPattern).nullable(),
    last_updated: z.iso.datetime({ offset: true }),
  })
  .passthrough();

const capabilities: ProviderCapabilities = {
  classes: ['crypto'],
  live: false,
  delayMinutes: 1,
  timeframes: [],
  historyDays: 0,
};

const coinGeckoIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

function retryAfterMs(response: Response): number | undefined {
  const raw = response.headers.get('retry-after');
  if (raw === null) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1_000;
  const date = Date.parse(raw);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

export type ProviderRequestPermit = () => Promise<void>;

export class CoinGeckoProvider implements MarketDataProvider {
  readonly id: ProviderId = 'coingecko' as ProviderId;
  readonly attributionText = 'Powered by CoinGecko';
  readonly storagePolicy = 'redis-only' as const;
  readonly capabilities = capabilities;

  private readonly instruments = new Map<Ticker, ProviderInstrument>();
  private readonly apiKey: string;
  private readonly fetcher: typeof fetch;
  private readonly permit: ProviderRequestPermit;
  private readonly now: () => Date;
  private readonly quotes = new Map<Ticker, Quote>();
  private readonly inFlight = new Map<Ticker, Promise<Quote>>();

  constructor(
    readonly sourceId: SourceId,
    rawInstruments: readonly ProviderInstrument[],
    apiKey: string,
    options: {
      fetcher?: typeof fetch;
      now?: () => Date;
      permit?: ProviderRequestPermit;
    } = {},
  ) {
    if (apiKey.trim() === '')
      throw new TypeError('CoinGecko API key is required');
    this.apiKey = apiKey;
    this.fetcher = options.fetcher ?? fetch;
    this.now = options.now ?? (() => new Date());
    this.permit = options.permit ?? (() => Promise.resolve());
    for (const rawInstrument of rawInstruments) {
      const instrument = parseProviderInstrument(rawInstrument);
      if (instrument.assetClass !== 'crypto') {
        throw new TypeError('CoinGecko instruments must be crypto assets');
      }
      coinGeckoIdSchema.parse(instrument.providerSymbol);
      this.instruments.set(instrument.ticker, instrument);
    }
  }

  supports(ticker: Ticker): boolean {
    return this.instruments.has(ticker);
  }

  async getQuote(ticker: Ticker): Promise<Quote> {
    const instrument = this.instruments.get(ticker);
    if (instrument === undefined) {
      throw new ProviderError(this.id, 'Ticker is not configured', {
        code: 'unsupported',
      });
    }
    const cached = this.quotes.get(ticker);
    if (cached !== undefined) {
      if (this.isFresh(cached)) return cached;
      this.quotes.delete(ticker);
    }
    const current = this.inFlight.get(ticker);
    if (current !== undefined) return current;
    const request = this.fetchQuote(instrument).finally(() => {
      this.inFlight.delete(ticker);
    });
    this.inFlight.set(ticker, request);
    return request;
  }

  getCandles(
    ...args: Parameters<MarketDataProvider['getCandles']>
  ): Promise<readonly Candle[]> {
    void args;
    return Promise.reject(
      new ProviderError(this.id, 'Candle history is not supported', {
        code: 'unsupported',
      }),
    );
  }

  private isFresh(quote: Quote): boolean {
    const asOf =
      quote.price.kind === 'value' ? quote.price.data.asOf : undefined;
    const age =
      asOf === undefined
        ? Number.POSITIVE_INFINITY
        : this.now().getTime() - asOf.getTime();
    return age >= 0 && age <= 30_000;
  }

  private async fetchQuote(instrument: ProviderInstrument): Promise<Quote> {
    await this.permit();
    const url = new URL('https://api.coingecko.com/api/v3/coins/markets');
    url.searchParams.set('vs_currency', instrument.currency.toLowerCase());
    url.searchParams.set('ids', instrument.providerSymbol);
    url.searchParams.set('price_change_percentage', '24h');
    url.searchParams.set('precision', 'full');

    let response: Response;
    try {
      response = await this.fetcher(url, {
        headers: { 'x-cg-demo-api-key': this.apiKey },
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      throw new ProviderError(this.id, 'CoinGecko request failed', {
        code: 'unavailable',
        cause: error,
      });
    }
    if (!response.ok) {
      const retry = retryAfterMs(response);
      throw new ProviderError(
        this.id,
        response.status === 429
          ? 'CoinGecko rate limit reached'
          : 'CoinGecko request failed',
        {
          code: response.status === 429 ? 'rate-limited' : 'unavailable',
          ...(retry === undefined ? {} : { retryAfterMs: retry }),
        },
      );
    }

    let decoded: unknown;
    try {
      decoded = parseExactJson(await response.text());
    } catch (error) {
      throw new ProviderError(this.id, 'CoinGecko response is not valid JSON', {
        code: 'invalid-response',
        cause: error,
      });
    }
    const rows = z.array(marketRowSchema).safeParse(decoded);
    if (!rows.success || rows.data.length !== 1) {
      throw new ProviderError(this.id, 'CoinGecko response failed validation', {
        code: 'invalid-response',
        cause: rows.success ? undefined : rows.error,
      });
    }
    const row = rows.data[0];
    if (row === undefined || row.id !== instrument.providerSymbol) {
      throw new ProviderError(this.id, 'CoinGecko returned the wrong asset', {
        code: 'invalid-response',
      });
    }
    const currentDecimal = new Decimal(row.current_price);
    if (!currentDecimal.isPositive()) {
      throw new ProviderError(this.id, 'CoinGecko price is invalid', {
        code: 'invalid-response',
      });
    }
    const asOf = new Date(row.last_updated);
    const age = this.now().getTime() - asOf.getTime();
    if (Number.isNaN(asOf.getTime()) || age < 0) {
      throw new ProviderError(this.id, 'CoinGecko quote timestamp is invalid', {
        code: 'invalid-response',
      });
    }
    const quote = createQuote({
      ticker: instrument.ticker,
      source: this.sourceId,
      currency: instrument.currency,
      asOf,
      freshness: 'delayed',
      delayMinutes: 1,
      price: row.current_price,
      ...(row.price_change_24h === null
        ? {}
        : { changeAbs: row.price_change_24h }),
      ...(row.price_change_percentage_24h === null
        ? {}
        : { changePct: row.price_change_percentage_24h }),
      ...(row.high_24h === null ? {} : { dayHigh: row.high_24h }),
      ...(row.low_24h === null ? {} : { dayLow: row.low_24h }),
      ...(row.total_volume === null ? {} : { volume: row.total_volume }),
    });
    if (age > 30_000) return staleQuote(quote);
    this.quotes.set(instrument.ticker, quote);
    return quote;
  }
}
