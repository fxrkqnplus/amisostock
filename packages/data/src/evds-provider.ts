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
  type Candle,
  type MarketDataProvider,
  type ProviderCapabilities,
  type ProviderInstrument,
} from './provider-contract.js';
import {
  decimalTextPattern,
  parseExactJson,
  parseProviderDate,
} from './provider-normalization.js';

const rowsSchema = z.array(z.record(z.string(), z.unknown()));

const capabilities: ProviderCapabilities = {
  classes: ['fx'],
  live: false,
  delayMinutes: 0,
  timeframes: [],
  historyDays: 0,
};

const evdsSeriesSchema = z.string().regex(/^[A-Z0-9]+(?:\.[A-Z0-9]+)+$/);

function evdsDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${date.getUTCFullYear()}`;
}

function currentIstanbulDate(now: Date): Date {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type: string): number => {
    const part = parts.find((item) => item.type === type)?.value;
    if (part === undefined) throw new Error('Could not read Istanbul date');
    return Number(part);
  };
  return new Date(Date.UTC(value('year'), value('month') - 1, value('day')));
}

function observationColumn(series: string): string {
  return series.replaceAll('.', '_');
}

function retryAfterMs(response: Response): number | undefined {
  const raw = response.headers.get('retry-after');
  if (raw === null) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1_000;
  const date = Date.parse(raw);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

export class EvdsProvider implements MarketDataProvider {
  readonly id: ProviderId = 'tcmb-evds' as ProviderId;
  readonly attributionText =
    'Kaynak: Türkiye Cumhuriyet Merkez Bankası (TCMB), EVDS.';
  readonly storagePolicy = 'database' as const;
  readonly capabilities = capabilities;

  private readonly instruments = new Map<Ticker, ProviderInstrument>();
  private readonly apiKey: string;
  private readonly fetcher: typeof fetch;
  private readonly now: () => Date;
  private readonly quotes = new Map<Ticker, Quote>();
  private refreshInFlight: Promise<void> | undefined;

  constructor(
    readonly sourceId: SourceId,
    rawInstruments: readonly ProviderInstrument[],
    apiKey: string,
    options: { fetcher?: typeof fetch; now?: () => Date } = {},
  ) {
    if (apiKey.trim() === '') throw new TypeError('EVDS API key is required');
    this.apiKey = apiKey;
    this.fetcher = options.fetcher ?? fetch;
    this.now = options.now ?? (() => new Date());
    for (const rawInstrument of rawInstruments) {
      const instrument = parseProviderInstrument(rawInstrument);
      if (instrument.assetClass !== 'fx') {
        throw new TypeError('EVDS instruments must be FX assets');
      }
      evdsSeriesSchema.parse(instrument.providerSymbol);
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
    if (!this.quotes.has(ticker)) await this.ensureLoaded();
    const quote = this.quotes.get(ticker);
    if (quote === undefined) {
      throw new ProviderError(this.id, 'EVDS has no published observation', {
        code: 'unavailable',
      });
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
    const endDate = currentIstanbulDate(this.now());
    const startDate = new Date(endDate.getTime() - 14 * 86_400_000);
    const series = [
      ...new Set(
        [...this.instruments.values()].map((item) => item.providerSymbol),
      ),
    ];
    const url = new URL(
      `https://evds2.tcmb.gov.tr/service/evds/series=${encodeURIComponent(series.join('-'))}`,
    );
    url.searchParams.set('startDate', evdsDate(startDate));
    url.searchParams.set('endDate', evdsDate(endDate));
    url.searchParams.set('type', 'json');

    let response: Response;
    try {
      response = await this.fetcher(url, {
        headers: { key: this.apiKey, accept: 'application/json' },
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      throw new ProviderError(this.id, 'EVDS request failed', {
        code: 'unavailable',
        cause: error,
      });
    }
    if (!response.ok) {
      const retry = retryAfterMs(response);
      throw new ProviderError(
        this.id,
        response.status === 429
          ? 'EVDS rate limit reached'
          : 'EVDS request failed',
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
      throw new ProviderError(this.id, 'EVDS response is not valid JSON', {
        code: 'invalid-response',
        cause: error,
      });
    }
    const rowsResult = rowsSchema.safeParse(decoded);
    if (!rowsResult.success || rowsResult.data.length === 0) {
      throw new ProviderError(this.id, 'EVDS response failed validation', {
        code: 'invalid-response',
        cause: rowsResult.success ? undefined : rowsResult.error,
      });
    }

    const stagedQuotes: Array<readonly [Ticker, Quote]> = [];
    for (const instrument of this.instruments.values()) {
      const column = observationColumn(instrument.providerSymbol);
      const observations = rowsResult.data.flatMap((row) => {
        const rawDate = row['Tarih'];
        const rawRate = row[column];
        if (typeof rawDate !== 'string') {
          throw new ProviderError(this.id, 'EVDS row has no observation date', {
            code: 'invalid-response',
          });
        }
        const observedAt = parseProviderDate(rawDate);
        if (observedAt === undefined) {
          throw new ProviderError(this.id, 'EVDS observation date is invalid', {
            code: 'invalid-response',
          });
        }
        if (
          rawRate === undefined ||
          rawRate === null ||
          rawRate === '' ||
          rawRate === '-'
        ) {
          return [];
        }
        if (typeof rawRate !== 'string' || !decimalTextPattern.test(rawRate)) {
          throw new ProviderError(this.id, 'EVDS rate is invalid', {
            code: 'invalid-response',
          });
        }
        const rate = new Decimal(rawRate);
        if (!rate.isPositive()) {
          throw new ProviderError(this.id, 'EVDS rate is not positive', {
            code: 'invalid-response',
          });
        }
        return [{ observedAt, rate: rawRate }];
      });
      observations.sort(
        (left, right) => right.observedAt.getTime() - left.observedAt.getTime(),
      );
      const latest = observations[0];
      if (latest === undefined) continue;
      const quote = createQuote({
        ticker: instrument.ticker,
        source: this.sourceId,
        currency: instrument.currency,
        asOf: latest.observedAt,
        freshness: 'close',
        price: latest.rate,
      });
      stagedQuotes.push([instrument.ticker, quote]);
    }
    if (stagedQuotes.length !== this.instruments.size) {
      throw new ProviderError(this.id, 'EVDS response omitted an FX series', {
        code: 'invalid-response',
      });
    }
    for (const [ticker, quote] of stagedQuotes) this.quotes.set(ticker, quote);
  }

  private async ensureLoaded(force = false): Promise<void> {
    if (
      !force &&
      this.instruments.size > 0 &&
      this.quotes.size === this.instruments.size
    ) {
      return;
    }
    if (this.refreshInFlight === undefined) {
      this.refreshInFlight = this.refreshQuotes().finally(() => {
        this.refreshInFlight = undefined;
      });
    }
    await this.refreshInFlight;
  }
}
