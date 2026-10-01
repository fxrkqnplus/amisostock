import { Decimal } from 'decimal.js';
import {
  parseIsoCurrency,
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
  unsignedDecimalTextPattern,
} from './provider-normalization.js';

const CURRENCY_PAIR = /^([A-Z]{3})\/([A-Z]{3})$/;
const STALE_AFTER_MS = 75 * 60_000;

const latestRatesSchema = z
  .object({
    timestamp: z.string().regex(/^\d+$/),
    base: z.literal('USD'),
    rates: z.record(
      z.string().regex(/^[A-Z]{3}$/),
      z.string().regex(decimalTextPattern),
    ),
  })
  .passthrough();

const capabilities: ProviderCapabilities = {
  classes: ['fx'],
  live: false,
  delayMinutes: 0,
  timeframes: [],
  historyDays: 0,
};

export type OpenExchangeRatesRequestPermit = () => Promise<void>;

function retryAfterMs(response: Response): number | undefined {
  const raw = response.headers.get('retry-after');
  if (raw === null) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1_000;
  const date = Date.parse(raw);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

function pairCurrencies(
  instrument: ProviderInstrument,
): readonly [string, string] {
  const match = CURRENCY_PAIR.exec(instrument.providerSymbol);
  if (match === null || instrument.ticker !== instrument.providerSymbol) {
    throw new TypeError(
      'Open Exchange Rates provider symbols must be ISO currency pairs',
    );
  }
  const base = match[1];
  const quote = match[2];
  if (base === undefined || quote === undefined) {
    throw new TypeError('Open Exchange Rates currency pair is invalid');
  }
  parseIsoCurrency(base);
  parseIsoCurrency(quote);
  if (instrument.currency !== quote) {
    throw new TypeError('FX quote currency must match the provider pair');
  }
  return [base, quote];
}

export class OpenExchangeRatesProvider implements MarketDataProvider {
  readonly id: ProviderId = 'open-exchange-rates' as ProviderId;
  readonly attributionText =
    'Kaynak: Open Exchange Rates; saatlik gösterge niteliğinde kur tahmini.';
  readonly storagePolicy = 'database' as const;
  readonly capabilities = capabilities;

  private readonly instruments = new Map<Ticker, ProviderInstrument>();
  private readonly appId: string;
  private readonly fetcher: typeof fetch;
  private readonly now: () => Date;
  private readonly permit: OpenExchangeRatesRequestPermit;
  private readonly quotes = new Map<Ticker, Quote>();
  private refreshInFlight: Promise<void> | undefined;

  constructor(
    readonly sourceId: SourceId,
    rawInstruments: readonly ProviderInstrument[],
    appId: string,
    options: {
      fetcher?: typeof fetch;
      now?: () => Date;
      permit?: OpenExchangeRatesRequestPermit;
    } = {},
  ) {
    if (appId.trim() === '') {
      throw new TypeError('Open Exchange Rates App ID is required');
    }
    this.appId = appId.trim();
    this.fetcher = options.fetcher ?? fetch;
    this.now = options.now ?? (() => new Date());
    this.permit = options.permit ?? (() => Promise.resolve());
    for (const rawInstrument of rawInstruments) {
      const instrument = parseProviderInstrument(rawInstrument);
      if (instrument.assetClass !== 'fx') {
        throw new TypeError(
          'Open Exchange Rates instruments must be FX assets',
        );
      }
      pairCurrencies(instrument);
      this.instruments.set(instrument.ticker, instrument);
    }
  }

  supports(ticker: Ticker): boolean {
    return this.instruments.has(ticker);
  }

  async getQuote(ticker: Ticker): Promise<Quote> {
    if (!this.instruments.has(ticker)) {
      throw new ProviderError(this.id, 'Ticker is not configured', {
        code: 'unsupported',
      });
    }
    if (this.quotes.size !== this.instruments.size) await this.ensureLoaded();
    const quote = this.quotes.get(ticker);
    if (quote === undefined) {
      throw new ProviderError(
        this.id,
        'No validated FX estimate is available',
        {
          code: 'unavailable',
        },
      );
    }
    return quote;
  }

  async refresh(): Promise<void> {
    await this.ensureLoaded(true);
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

  private async refreshQuotes(): Promise<void> {
    if (this.instruments.size === 0) return;
    await this.permit();
    const currencies = new Set<string>(['USD']);
    for (const instrument of this.instruments.values()) {
      const [base, quote] = pairCurrencies(instrument);
      currencies.add(base);
      currencies.add(quote);
    }
    const url = new URL('https://openexchangerates.org/api/latest.json');
    url.searchParams.set('symbols', [...currencies].sort().join(','));

    let response: Response;
    try {
      response = await this.fetcher(url, {
        headers: {
          Authorization: `Token ${this.appId}`,
          accept: 'application/json',
        },
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      throw new ProviderError(this.id, 'Open Exchange Rates request failed', {
        code: 'unavailable',
        cause: error,
      });
    }
    if (!response.ok) {
      const retry = retryAfterMs(response);
      throw new ProviderError(
        this.id,
        response.status === 429
          ? 'Open Exchange Rates rate limit reached'
          : 'Open Exchange Rates request failed',
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
      throw new ProviderError(
        this.id,
        'Open Exchange Rates response is not valid JSON',
        { code: 'invalid-response', cause: error },
      );
    }
    const parsed = latestRatesSchema.safeParse(decoded);
    if (!parsed.success) {
      throw new ProviderError(
        this.id,
        'Open Exchange Rates response failed validation',
        { code: 'invalid-response', cause: parsed.error },
      );
    }
    const timestamp = Number(parsed.data.timestamp);
    if (!Number.isSafeInteger(timestamp)) {
      throw new ProviderError(this.id, 'FX estimate timestamp is invalid', {
        code: 'invalid-response',
      });
    }
    const asOf = new Date(timestamp * 1_000);
    const age = this.now().getTime() - asOf.getTime();
    if (Number.isNaN(asOf.getTime()) || age < 0) {
      throw new ProviderError(this.id, 'FX estimate timestamp is invalid', {
        code: 'invalid-response',
      });
    }

    const rates = parsed.data.rates;
    const stagedQuotes: Array<readonly [Ticker, Quote]> = [];
    for (const instrument of this.instruments.values()) {
      const [base, quote] = pairCurrencies(instrument);
      const baseRate = base === 'USD' ? '1' : rates[base];
      const quoteRate = quote === 'USD' ? '1' : rates[quote];
      if (
        baseRate === undefined ||
        quoteRate === undefined ||
        !unsignedDecimalTextPattern.test(baseRate) ||
        !unsignedDecimalTextPattern.test(quoteRate)
      ) {
        throw new ProviderError(
          this.id,
          'Open Exchange Rates omitted a configured currency',
          { code: 'invalid-response' },
        );
      }
      const baseDecimal = new Decimal(baseRate);
      const quoteDecimal = new Decimal(quoteRate);
      if (!baseDecimal.isPositive() || !quoteDecimal.isPositive()) {
        throw new ProviderError(this.id, 'FX estimate rate is not positive', {
          code: 'invalid-response',
        });
      }
      const rateText = quoteDecimal
        .div(baseDecimal)
        .toDecimalPlaces(6, Decimal.ROUND_HALF_UP)
        .toString();
      const value = createQuote({
        ticker: instrument.ticker,
        source: this.sourceId,
        currency: instrument.currency,
        asOf,
        freshness: 'estimate',
        price: rateText,
      });
      stagedQuotes.push([
        instrument.ticker,
        age > STALE_AFTER_MS ? staleQuote(value) : value,
      ]);
    }
    if (stagedQuotes.length !== this.instruments.size) {
      throw new ProviderError(this.id, 'FX response was incomplete', {
        code: 'invalid-response',
      });
    }
    for (const [ticker, quote] of stagedQuotes) this.quotes.set(ticker, quote);
  }

  private async ensureLoaded(force = false): Promise<void> {
    if (!force && this.quotes.size === this.instruments.size) return;
    if (this.refreshInFlight === undefined) {
      this.refreshInFlight = this.refreshQuotes().finally(() => {
        this.refreshInFlight = undefined;
      });
    }
    await this.refreshInFlight;
  }
}
