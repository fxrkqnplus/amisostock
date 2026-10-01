import type {
  CurrencyCode,
  ProviderId,
  Quote,
  SourceId,
  Ticker,
} from '@amisostock/shared';
import {
  currencyCodeSchema,
  parseProviderId,
  parseQuote,
  parseTicker,
  providerIdSchema,
  quoteSchema,
  sourceIdSchema,
  type DisplayDatum,
} from '@amisostock/shared';
import { z } from 'zod';

export const MARKET_QUOTE_CHANNEL = 'amisostock:market:quotes:v1';

export type AssetClass = 'crypto' | 'fx';
export type Timeframe = '1m' | '5m' | '1h' | '1d';

export type ProviderInstrument = Readonly<{
  ticker: Ticker;
  assetClass: AssetClass;
  currency: CurrencyCode;
  providerSymbol: string;
}>;

export type Candle = Readonly<{
  ticker: Ticker;
  timeframe: Timeframe;
  asOf: Date;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string | null;
  currency: CurrencyCode;
  source: SourceId;
}>;

export type ProviderCapabilities = Readonly<{
  classes: readonly AssetClass[];
  live: boolean;
  delayMinutes: number;
  timeframes: readonly Timeframe[];
  historyDays: number;
}>;

export type Unsubscribe = () => void;

export const providerInstrumentSchema = z
  .object({
    ticker: z.string().transform(parseTicker),
    assetClass: z.enum(['crypto', 'fx']),
    currency: z.string().transform((value) => currencyCodeSchema.parse(value)),
    providerSymbol: z.string().trim().min(1).max(128),
  })
  .strict();

export type QuoteSnapshot = Readonly<{
  ticker: Ticker;
  source: SourceId;
  currency: CurrencyCode;
  asOf: Date;
  freshness: 'live' | 'delayed' | 'close';
  delayMinutes?: number;
  price: string;
  changeAbs?: string;
  changePct?: string;
  dayHigh?: string;
  dayLow?: string;
  volume?: string;
}>;

export const marketQuoteEventSchema = z
  .object({
    ticker: z.string().transform(parseTicker),
    providerId: z.string().transform((value) => providerIdSchema.parse(value)),
    attributionText: z.string().nullable(),
    quote: quoteSchema,
  })
  .strict();

export type MarketQuoteEvent = z.infer<typeof marketQuoteEventSchema>;

export function parseMarketQuoteEvent(input: unknown): MarketQuoteEvent {
  const event = marketQuoteEventSchema.parse(input);
  if (event.ticker !== event.quote.ticker) {
    throw new TypeError('Market event ticker does not match quote ticker');
  }
  return event;
}

const noData = { kind: 'no-data' } as const;

function sourcedValue(value: string | undefined, snapshot: QuoteSnapshot) {
  if (value === undefined) return noData;
  const metadata = {
    source: snapshot.source,
    asOf: snapshot.asOf,
    freshness: snapshot.freshness,
    ...(snapshot.freshness === 'delayed'
      ? { delayMinutes: snapshot.delayMinutes }
      : {}),
  };
  return {
    kind: 'value' as const,
    data: {
      ...metadata,
      value: value,
    },
  };
}

function sourcedMoney(value: string | undefined, snapshot: QuoteSnapshot) {
  if (value === undefined) return noData;
  const datum = sourcedValue(value, snapshot);
  if (datum.kind !== 'value') return datum;
  return {
    ...datum,
    data: {
      ...datum.data,
      value: { amount: value, currency: snapshot.currency },
    },
  };
}

export function createQuote(snapshot: QuoteSnapshot): Quote {
  const normalizedSnapshot = {
    ...snapshot,
    ticker: parseTicker(snapshot.ticker),
    source: sourceIdSchema.parse(snapshot.source),
    currency: currencyCodeSchema.parse(snapshot.currency),
    asOf: z.date().parse(snapshot.asOf),
  };
  return parseQuote({
    ticker: normalizedSnapshot.ticker,
    price: sourcedMoney(normalizedSnapshot.price, normalizedSnapshot),
    changeAbs: sourcedMoney(normalizedSnapshot.changeAbs, normalizedSnapshot),
    changePct: sourcedValue(normalizedSnapshot.changePct, normalizedSnapshot),
    dayHigh: sourcedMoney(normalizedSnapshot.dayHigh, normalizedSnapshot),
    dayLow: sourcedMoney(normalizedSnapshot.dayLow, normalizedSnapshot),
    volume: sourcedValue(normalizedSnapshot.volume, normalizedSnapshot),
  });
}

export function parseProviderInstrument(input: unknown): ProviderInstrument {
  const instrument = providerInstrumentSchema.parse(input);
  return {
    ...instrument,
    currency: instrument.currency,
  };
}

export function validateProviderId(input: unknown): ProviderId {
  return parseProviderId(input);
}

export function quoteHasValue(quote: Quote): boolean {
  return quote.price.kind === 'value';
}

export function staleQuote(quote: Quote): Quote {
  const stale = <Value>(datum: DisplayDatum<Value>): DisplayDatum<Value> => {
    if (datum.kind !== 'value') return datum;
    return {
      kind: 'stale',
      source: datum.data.source,
      asOf: datum.data.asOf,
    };
  };
  return {
    ...quote,
    price: stale(quote.price),
    changeAbs: stale(quote.changeAbs),
    changePct: stale(quote.changePct),
    dayHigh: stale(quote.dayHigh),
    dayLow: stale(quote.dayLow),
    volume: stale(quote.volume),
  };
}

export interface MarketDataProvider {
  readonly id: ProviderId;
  readonly sourceId: SourceId;
  readonly attributionText: string | null;
  readonly storagePolicy: 'database' | 'redis-only';
  readonly capabilities: ProviderCapabilities;
  supports(ticker: Ticker): boolean;
  getQuote(ticker: Ticker): Promise<Quote>;
  getCandles(
    ticker: Ticker,
    timeframe: Timeframe,
    from: Date,
    to: Date,
  ): Promise<readonly Candle[]>;
  subscribe?(
    tickers: readonly Ticker[],
    onTick: (quote: Quote) => void,
  ): Unsubscribe;
}
