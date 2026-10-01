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
  type Unsubscribe,
} from './provider-contract.js';
import {
  decimalTextPattern,
  parseExactJson,
} from './provider-normalization.js';

const tickerEventSchema = z
  .object({
    E: z.string().regex(/^\d+$/),
    s: z.string().regex(/^[A-Z0-9]+$/),
    p: z.string().regex(decimalTextPattern),
    P: z.string().regex(decimalTextPattern),
    c: z.string().regex(decimalTextPattern),
    h: z.string().regex(decimalTextPattern),
    l: z.string().regex(decimalTextPattern),
    v: z.string().regex(decimalTextPattern),
  })
  .passthrough();

const combinedStreamSchema = z
  .object({
    stream: z.string().min(1),
    data: tickerEventSchema,
  })
  .strict();

export interface BinanceSocket {
  addEventListener(type: string, listener: (event: unknown) => void): void;
  close(): void;
}

export type BinanceSocketFactory = (url: string) => BinanceSocket;
export type ProviderErrorHandler = (error: ProviderError) => void;

const capabilities: ProviderCapabilities = {
  classes: ['crypto'],
  live: true,
  delayMinutes: 0,
  timeframes: [],
  historyDays: 0,
};

const binanceSymbolSchema = z.string().regex(/^[A-Za-z0-9]{3,20}$/);

function createSocket(url: string): BinanceSocket {
  return new WebSocket(url);
}

function eventData(event: unknown): unknown {
  if (typeof event !== 'object' || event === null || !('data' in event)) {
    return undefined;
  }
  return event.data;
}

export class BinanceSpotProvider implements MarketDataProvider {
  readonly id: ProviderId = 'binance' as ProviderId;
  readonly attributionText = 'Piyasa verisi: Binance Spot.';
  readonly storagePolicy = 'database' as const;
  readonly capabilities = capabilities;

  private readonly instruments = new Map<Ticker, ProviderInstrument>();
  private readonly byProviderSymbol = new Map<string, ProviderInstrument>();
  private readonly quotes = new Map<Ticker, Quote>();
  private readonly listeners = new Set<(quote: Quote) => void>();
  private readonly socketFactory: BinanceSocketFactory;
  private readonly onError: ProviderErrorHandler;
  private socket: BinanceSocket | undefined;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private reconnectAttempts = 0;
  private stopped = true;

  constructor(
    sourceId: SourceId,
    rawInstruments: readonly ProviderInstrument[],
    options: {
      onError?: ProviderErrorHandler;
      socketFactory?: BinanceSocketFactory;
    } = {},
  ) {
    this.sourceId = sourceId;
    this.socketFactory = options.socketFactory ?? createSocket;
    this.onError = options.onError ?? (() => undefined);
    for (const rawInstrument of rawInstruments) {
      const instrument = parseProviderInstrument(rawInstrument);
      if (instrument.assetClass !== 'crypto') {
        throw new TypeError('Binance Spot instruments must be crypto assets');
      }
      const providerSymbol = binanceSymbolSchema.parse(
        instrument.providerSymbol,
      );
      if (this.instruments.has(instrument.ticker)) {
        throw new TypeError(`Duplicate Binance ticker: ${instrument.ticker}`);
      }
      this.instruments.set(instrument.ticker, instrument);
      this.byProviderSymbol.set(providerSymbol.toUpperCase(), instrument);
    }
  }

  readonly sourceId: SourceId;

  supports(ticker: Ticker): boolean {
    return this.instruments.has(ticker);
  }

  getQuote(ticker: Ticker): Promise<Quote> {
    const instrument = this.instruments.get(ticker);
    if (instrument === undefined) {
      return Promise.reject(
        new ProviderError(this.id, 'Ticker is not configured', {
          code: 'unsupported',
        }),
      );
    }
    const quote = this.quotes.get(ticker);
    if (quote?.price.kind !== 'value') {
      return Promise.reject(
        new ProviderError(this.id, 'Binance stream has no quote yet', {
          code: 'unavailable',
        }),
      );
    }
    const quoteTimestamp = quote.price.data.asOf.getTime();
    const ageMs = Date.now() - quoteTimestamp;
    if (ageMs < 0 || ageMs > 30_000) {
      return Promise.reject(
        new ProviderError(this.id, 'Binance quote is stale', {
          code: 'unavailable',
        }),
      );
    }
    return Promise.resolve(quote);
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

  subscribe(
    tickers: readonly Ticker[],
    onTick: (quote: Quote) => void,
  ): Unsubscribe {
    for (const ticker of tickers) {
      if (!this.instruments.has(ticker)) {
        throw new ProviderError(this.id, 'Ticker is not configured', {
          code: 'unsupported',
        });
      }
    }
    this.listeners.add(onTick);
    if (this.stopped) this.connect();
    return () => {
      this.listeners.delete(onTick);
      if (this.listeners.size === 0) this.stop();
    };
  }

  close(): void {
    this.stop();
  }

  private connect(): void {
    if (this.instruments.size === 0 || this.listeners.size === 0) return;
    this.stopped = false;
    const streams = [...this.instruments.values()]
      .map((instrument) => `${instrument.providerSymbol.toLowerCase()}@ticker`)
      .join(String.fromCharCode(47));
    const url = new URL(
      `stream?streams=${streams}`,
      'wss://stream.binance.com:9443/',
    ).toString();
    try {
      const socket = this.socketFactory(url);
      this.socket = socket;
      socket.addEventListener('open', () => {
        this.reconnectAttempts = 0;
      });
      socket.addEventListener('message', (event) => {
        try {
          const quote = this.parseMessage(eventData(event));
          if (quote === undefined) return;
          this.quotes.set(quote.ticker, quote);
          for (const listener of this.listeners) listener(quote);
        } catch (error) {
          this.onError(
            error instanceof ProviderError
              ? error
              : new ProviderError(this.id, 'Invalid Binance message', {
                  code: 'invalid-response',
                  cause: error,
                }),
          );
        }
      });
      socket.addEventListener('error', () => {
        this.onError(
          new ProviderError(this.id, 'Binance WebSocket error', {
            code: 'unavailable',
          }),
        );
      });
      socket.addEventListener('close', () => {
        if (this.socket === socket) this.socket = undefined;
        if (!this.stopped) this.scheduleReconnect();
      });
    } catch (error) {
      this.onError(
        new ProviderError(this.id, 'Could not open Binance WebSocket', {
          code: 'unavailable',
          cause: error,
        }),
      );
      this.scheduleReconnect();
    }
  }

  private stop(): void {
    this.stopped = true;
    if (this.reconnectTimer !== undefined) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    const socket = this.socket;
    this.socket = undefined;
    socket?.close();
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer !== undefined) return;
    const delayMs = Math.min(2 ** this.reconnectAttempts * 1_000, 300_000);
    this.reconnectAttempts = Math.min(this.reconnectAttempts + 1, 6);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, delayMs);
    this.reconnectTimer.unref?.();
  }

  private parseMessage(raw: unknown): Quote | undefined {
    if (typeof raw !== 'string') {
      throw new ProviderError(this.id, 'Binance message is not text', {
        code: 'invalid-response',
      });
    }
    let decoded: unknown;
    try {
      decoded = parseExactJson(raw);
    } catch (error) {
      throw new ProviderError(this.id, 'Binance message is not valid JSON', {
        code: 'invalid-response',
        cause: error,
      });
    }
    const parsed = combinedStreamSchema.safeParse(decoded);
    if (!parsed.success) {
      throw new ProviderError(this.id, 'Binance message failed validation', {
        code: 'invalid-response',
        cause: parsed.error,
      });
    }
    const event = parsed.data.data;
    const instrument = this.byProviderSymbol.get(event.s);
    if (instrument === undefined) {
      throw new ProviderError(this.id, 'Binance returned an unknown symbol', {
        code: 'invalid-response',
      });
    }
    const eventTime = Number(event.E);
    const asOf = new Date(eventTime);
    const latestDecimal = new Decimal(event.c);
    const high = new Decimal(event.h);
    const low = new Decimal(event.l);
    const volume = new Decimal(event.v);
    if (
      !Number.isSafeInteger(eventTime) ||
      Number.isNaN(asOf.getTime()) ||
      !latestDecimal.isPositive() ||
      !high.greaterThanOrEqualTo(low) ||
      volume.isNegative()
    ) {
      throw new ProviderError(this.id, 'Binance ticker values are invalid', {
        code: 'invalid-response',
      });
    }
    return createQuote({
      ticker: instrument.ticker,
      source: this.sourceId,
      currency: instrument.currency,
      asOf,
      freshness: 'live',
      price: event.c,
      changeAbs: event.p,
      changePct: event.P,
      dayHigh: event.h,
      dayLow: event.l,
      volume: event.v,
    });
  }
}
