import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import pino, { type Logger } from 'pino';
import { z } from 'zod';
import {
  BinanceSpotProvider,
  CoinGeckoProvider,
  EvdsProvider,
  OpenExchangeRatesProvider,
  ProviderError,
  ProviderRegistry,
  parseMarketQuoteEvent,
  staleQuote,
  type MarketQuoteEvent,
  type ProviderInstrument,
  type ResolvedQuote,
  MARKET_QUOTE_CHANNEL,
} from '@amisostock/data';
import {
  createDatabaseClient,
  type AssetProviderMapping,
} from '@amisostock/db/client';
import {
  parseCurrencyCode,
  parseProviderId,
  parseSourceId,
  parseTicker,
  type ProviderId,
} from '@amisostock/shared';
import { RedisProviderRateLimiter } from './provider-rate-limit.js';

const quoteCacheKey = (ticker: string, providerId: string) =>
  `amisostock:market:quote:v2:${ticker}:${providerId}`;
const legacyQuoteCacheKey = (ticker: string) =>
  `amisostock:market:quote:v1:${ticker}`;
const quoteEventKey = (ticker: string, providerId: string) =>
  `${ticker}:${providerId}`;
const healthCacheKey = (providerId: string) =>
  `amisostock:provider:health:v1:${providerId}`;
const failureCountKey = (providerId: string) =>
  `amisostock:provider:failures:v1:${providerId}`;
const backoffCacheKey = (providerId: string) =>
  `amisostock:provider:backoff:v1:${providerId}`;
const QUOTE_CACHE_SECONDS = 86_400;
type MarketDataDatabase = ReturnType<typeof createDatabaseClient>;

const workerEnvironmentSchema = z
  .object({
    DATABASE_URL: z.url().refine((value) => /^postgres(?:ql)?:/.test(value)),
    REDIS_URL: z.url().refine((value) => /^rediss?:/.test(value)),
    EVDS_API_KEY: z.string().trim().default(''),
    OPEN_EXCHANGE_RATES_APP_ID: z.string().trim().default(''),
    PROVIDER_CRYPTO_FALLBACK: z.enum(['', 'coingecko']).default(''),
    COINGECKO_API_KEY: z.string().trim().default(''),
    LOG_LEVEL: z
      .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
      .default('info'),
  })
  .superRefine((value, context) => {
    if (
      value.PROVIDER_CRYPTO_FALLBACK === 'coingecko' &&
      value.COINGECKO_API_KEY === ''
    ) {
      context.addIssue({
        code: 'custom',
        path: ['COINGECKO_API_KEY'],
        message: 'required when CoinGecko is enabled',
      });
    }
  });

export type MarketDataWorkerEnvironment = z.infer<
  typeof workerEnvironmentSchema
>;

export function parseMarketDataWorkerEnvironment(
  input: unknown,
): MarketDataWorkerEnvironment {
  const result = workerEnvironmentSchema.safeParse(input);
  if (!result.success) {
    const fields = [
      ...new Set(result.error.issues.map((issue) => issue.path.join('.'))),
    ];
    throw new Error(`Worker configuration is invalid: ${fields.join(', ')}`);
  }
  return result.data;
}

function makeInstrument(row: AssetProviderMapping): ProviderInstrument {
  if (row.assetClass !== 'crypto' && row.assetClass !== 'fx') {
    throw new Error(
      `Provider mapping has unsupported asset class: ${row.ticker}`,
    );
  }
  return {
    ticker: parseTicker(row.ticker),
    assetClass: row.assetClass,
    currency: parseCurrencyCode(row.currency),
    providerSymbol: row.providerSymbol,
  };
}

type QuoteMoneyDatum = ResolvedQuote['quote']['price'];
type QuoteDecimalDatum = ResolvedQuote['quote']['changePct'];

function quoteAmount(datum: QuoteMoneyDatum): string | null {
  return datum.kind === 'value' ? datum.data.value.amount.toString() : null;
}

function quoteDecimal(datum: QuoteDecimalDatum): string | null {
  return datum.kind === 'value' ? datum.data.value.toString() : null;
}

export class MarketQuotePipeline {
  private readonly cachedEvents = new Map<
    string,
    Readonly<{ event: MarketQuoteEvent; stalePublished: boolean }>
  >();

  constructor(
    private readonly redis: Redis,
    private readonly database: Pick<
      MarketDataDatabase,
      'upsertMarketQuote' | 'query'
    >,
    private readonly registry: ProviderRegistry,
    private readonly sourceIds: ReadonlyMap<ProviderId, string>,
    private readonly assetIds: ReadonlyMap<string, string>,
    private readonly logger: Logger,
  ) {}

  async ingest(
    ticker: string,
    skipProviders: ReadonlySet<ProviderId> = new Set(),
  ): Promise<MarketQuoteEvent> {
    const normalizedTicker = parseTicker(ticker);
    const resolved = await this.registry.getQuote(
      normalizedTicker,
      skipProviders,
    );
    return this.publishResolved(normalizedTicker, resolved);
  }

  async ingestFromProvider(
    ticker: string,
    providerId: ProviderId,
  ): Promise<MarketQuoteEvent> {
    const normalizedTicker = parseTicker(ticker);
    const resolved = await this.registry.getQuoteFromProvider(
      providerId,
      normalizedTicker,
    );
    return this.publishResolved(normalizedTicker, resolved);
  }

  private async publishResolved(
    normalizedTicker: ReturnType<typeof parseTicker>,
    resolved: ResolvedQuote,
  ): Promise<MarketQuoteEvent> {
    const event: MarketQuoteEvent = {
      ticker: normalizedTicker,
      providerId: resolved.providerId,
      attributionText: resolved.attributionText,
      quote: resolved.quote,
    };
    if (resolved.persist && resolved.quote.price.kind === 'value') {
      await this.persist(resolved);
    }
    await this.storeAndPublish(event);
    await this.recordSuccess(resolved.providerId);
    return event;
  }

  async publishFallbackCrypto(tickers: readonly string[]): Promise<void> {
    for (const ticker of tickers) {
      const providers = this.registry.providersFor(parseTicker(ticker));
      const primary = providers[0];
      if (primary === undefined) continue;
      const primaryBackoff = await this.backoffCode(primary.id);
      if (primaryBackoff !== null) {
        if (
          primaryBackoff !== 'invalid-response' &&
          primaryBackoff !== 'unsupported' &&
          providers.length > 1
        ) {
          await this.tryFallback(ticker, primary.id);
        }
        continue;
      }
      try {
        const quote = await primary.getQuote(parseTicker(ticker));
        if (quote.price.kind === 'value') continue;
      } catch (error) {
        const normalized =
          error instanceof ProviderError
            ? error
            : new ProviderError(primary.id, 'Provider request failed', {
                code: 'unavailable',
                cause: error,
              });
        if (
          normalized.code === 'invalid-response' ||
          normalized.code === 'unsupported'
        ) {
          await this.recordFailure(primary.id, normalized);
          continue;
        }
        await this.recordFailure(primary.id, normalized);
        await this.tryFallback(ticker, primary.id);
      }
    }
  }

  async handleProviderFailure(error: ProviderError): Promise<void> {
    await this.recordFailure(error.providerId, error);
  }

  async hydrateCachedEvents(tickers: Iterable<string>): Promise<void> {
    for (const input of tickers) {
      const ticker = parseTicker(input);
      const providers = this.registry.providersFor(ticker);
      const legacyKey = legacyQuoteCacheKey(ticker);
      const legacyEncoded = await this.redis.get(legacyKey);
      if (legacyEncoded !== null) {
        try {
          const event = parseMarketQuoteEvent(
            JSON.parse(legacyEncoded) as unknown,
          );
          if (
            event.ticker === ticker &&
            providers.some((provider) => provider.id === event.providerId)
          ) {
            await this.redis.set(
              quoteCacheKey(ticker, event.providerId),
              legacyEncoded,
              'EX',
              QUOTE_CACHE_SECONDS,
            );
            await this.redis.del(legacyKey);
            this.cachedEvents.set(quoteEventKey(ticker, event.providerId), {
              event,
              stalePublished: false,
            });
          }
        } catch {
          this.logger.warn({ ticker }, 'Discarded invalid cached market quote');
          await this.redis.del(legacyKey);
        }
      }
      for (const provider of providers) {
        const key = quoteCacheKey(ticker, provider.id);
        const encoded = await this.redis.get(key);
        if (encoded === null) continue;
        try {
          const event = parseMarketQuoteEvent(JSON.parse(encoded) as unknown);
          if (event.ticker !== ticker || event.providerId !== provider.id) {
            throw new TypeError('Cached quote does not match its Redis key');
          }
          this.cachedEvents.set(quoteEventKey(ticker, provider.id), {
            event,
            stalePublished: false,
          });
        } catch {
          this.logger.warn(
            { ticker, providerId: provider.id },
            'Discarded invalid cached market quote',
          );
          await this.redis.del(key);
        }
      }
    }
  }

  async markStaleQuotes(): Promise<void> {
    const now = Date.now();
    for (const [eventKey, cached] of this.cachedEvents) {
      if (cached.stalePublished) continue;
      const datum = cached.event.quote.price;
      if (datum.kind === 'stale') {
        await this.storeAndPublish(cached.event);
        this.cachedEvents.set(eventKey, {
          event: cached.event,
          stalePublished: true,
        });
        continue;
      }
      if (cached.event.providerId === 'tcmb-evds') continue;
      if (datum.kind !== 'value') continue;
      const age = now - datum.data.asOf.getTime();
      const staleAfter =
        cached.event.providerId === 'open-exchange-rates'
          ? 75 * 60_000
          : 30_000;
      if (age <= staleAfter) continue;
      const event: MarketQuoteEvent = {
        ...cached.event,
        quote: staleQuote(cached.event.quote),
      };
      await this.storeAndPublish(event);
      this.cachedEvents.set(eventKey, { event, stalePublished: true });
    }
  }

  async refreshEvds(
    provider: EvdsProvider,
    tickers: readonly string[],
  ): Promise<void> {
    try {
      await provider.refresh();
      for (const ticker of tickers) {
        await this.ingestFromProvider(ticker, provider.id);
      }
    } catch (error) {
      const providerError =
        error instanceof ProviderError
          ? error
          : new ProviderError(provider.id, 'Provider request failed', {
              code: 'unavailable',
              cause: error,
            });
      await this.recordFailure(provider.id, providerError);
      if (providerError.code !== 'rate-limited') throw providerError;
    }
  }

  async stop(): Promise<void> {
    await this.redis.quit();
  }

  async refreshOpenExchangeRates(
    provider: OpenExchangeRatesProvider,
    tickers: readonly string[],
  ): Promise<void> {
    try {
      await provider.refresh();
      for (const ticker of tickers) {
        await this.ingestFromProvider(ticker, provider.id);
      }
    } catch (error) {
      const providerError =
        error instanceof ProviderError
          ? error
          : new ProviderError(provider.id, 'Provider request failed', {
              code: 'unavailable',
              cause: error,
            });
      await this.recordFailure(provider.id, providerError);
      if (providerError.code !== 'rate-limited') throw providerError;
    }
  }

  private async persist(resolved: ResolvedQuote): Promise<void> {
    const assetId = this.assetIds.get(resolved.quote.ticker);
    if (assetId === undefined) {
      throw new Error(
        `No database asset is mapped for ${resolved.quote.ticker}`,
      );
    }
    const valueDatum = resolved.quote.price;
    if (valueDatum.kind !== 'value') {
      throw new ProviderError(resolved.providerId, 'Quote has no price', {
        code: 'invalid-response',
      });
    }
    const quoteValue = valueDatum.data.value;
    const changeAbs = resolved.quote.changeAbs;
    const changePct = resolved.quote.changePct;
    const dayHigh = resolved.quote.dayHigh;
    const dayLow = resolved.quote.dayLow;
    const volume = resolved.quote.volume;
    await this.database.upsertMarketQuote({
      assetId,
      currency: quoteValue.currency,
      price: quoteValue.amount.toString(),
      changeAbs: quoteAmount(changeAbs),
      changePct: quoteDecimal(changePct),
      dayHigh: quoteAmount(dayHigh),
      dayLow: quoteAmount(dayLow),
      volume: quoteDecimal(volume),
      asOf: valueDatum.data.asOf,
      sourceId: valueDatum.data.source,
      freshness: valueDatum.data.freshness,
      delayMinutes:
        valueDatum.data.freshness === 'delayed'
          ? valueDatum.data.delayMinutes
          : null,
    });
  }

  private async storeAndPublish(event: MarketQuoteEvent): Promise<void> {
    const encoded = JSON.stringify(event);
    await this.redis
      .multi()
      .set(
        quoteCacheKey(event.ticker, event.providerId),
        encoded,
        'EX',
        QUOTE_CACHE_SECONDS,
      )
      .publish(MARKET_QUOTE_CHANNEL, encoded)
      .exec();
    this.cachedEvents.set(quoteEventKey(event.ticker, event.providerId), {
      event,
      stalePublished: false,
    });
    this.logger.debug(
      { ticker: event.ticker, providerId: event.providerId },
      'Market quote published',
    );
  }

  private async recordSuccess(providerId: ProviderId): Promise<void> {
    const sourceId = this.sourceIds.get(providerId);
    await this.redis.set(failureCountKey(providerId), '0');
    if (sourceId === undefined) return;
    await this.database.query(
      `INSERT INTO provider_health (source_id, last_success_at, consecutive_failures, state, updated_at)
       VALUES ($1, now(), 0, 'healthy', now())
       ON CONFLICT (source_id) DO UPDATE SET
         last_success_at = now(), consecutive_failures = 0,
         state = 'healthy', updated_at = now()`,
      [sourceId],
    );
    await this.redis
      .multi()
      .set(
        healthCacheKey(providerId),
        JSON.stringify({
          state: 'healthy',
          consecutiveFailures: 0,
          updatedAt: new Date().toISOString(),
        }),
        'EX',
        QUOTE_CACHE_SECONDS,
      )
      .del(backoffCacheKey(providerId))
      .exec();
  }

  private async recordFailure(
    providerId: ProviderId,
    error: ProviderError,
  ): Promise<void> {
    const failures = await this.redis.incr(failureCountKey(providerId));
    const state =
      failures >= 10 ? 'down' : failures >= 3 ? 'degraded' : 'healthy';
    const retryAfterMs =
      error.code === 'rate-limited'
        ? Math.max(1_000, error.retryAfterMs ?? 60_000)
        : Math.min(2 ** (failures - 1) * 1_000, 300_000);
    const sourceId = this.sourceIds.get(providerId);
    if (sourceId !== undefined) {
      await this.database.query(
        `INSERT INTO provider_health (source_id, consecutive_failures, state, updated_at)
       VALUES ($1, $2, $3::provider_health_state, now())
       ON CONFLICT (source_id) DO UPDATE SET
         consecutive_failures = EXCLUDED.consecutive_failures,
         state = EXCLUDED.state,
         updated_at = now()`,
        [sourceId, failures, state],
      );
    }
    await this.redis
      .multi()
      .set(
        healthCacheKey(providerId),
        JSON.stringify({
          consecutiveFailures: failures,
          state,
          updatedAt: new Date().toISOString(),
        }),
        'EX',
        QUOTE_CACHE_SECONDS,
      )
      .set(backoffCacheKey(providerId), error.code, 'PX', retryAfterMs)
      .exec();
    this.logger.warn(
      {
        providerId,
        code: error.code,
        retryAfterMs: error.retryAfterMs,
      },
      'Market-data provider request failed',
    );
  }

  private async backoffCode(
    providerId: ProviderId,
  ): Promise<ProviderError['code'] | null> {
    const code = await this.redis.get(backoffCacheKey(providerId));
    if (
      code === 'invalid-response' ||
      code === 'unavailable' ||
      code === 'rate-limited' ||
      code === 'unsupported'
    ) {
      return code;
    }
    return null;
  }

  private async tryFallback(
    ticker: string,
    primaryProviderId: ProviderId,
  ): Promise<void> {
    const candidates = this.registry.providersFor(parseTicker(ticker));
    const skipProviders = new Set<ProviderId>([primaryProviderId]);
    for (const provider of candidates) {
      if ((await this.backoffCode(provider.id)) !== null) {
        skipProviders.add(provider.id);
      }
    }
    if (skipProviders.size >= candidates.length) return;
    try {
      await this.ingest(ticker, skipProviders);
    } catch (error) {
      const providerError =
        error instanceof ProviderError
          ? error
          : new ProviderError(primaryProviderId, 'Provider request failed', {
              code: 'unavailable',
              cause: error,
            });
      await this.recordFailure(providerError.providerId, providerError);
    }
  }
}

export async function startMarketDataWorker(
  rawEnvironment: unknown = process.env,
  loggerOverride?: Logger,
): Promise<Readonly<{ close: () => Promise<void> }>> {
  const environment = parseMarketDataWorkerEnvironment(rawEnvironment);
  const logger = loggerOverride ?? pino({ level: environment.LOG_LEVEL });
  const database = createDatabaseClient(environment.DATABASE_URL);
  const redis = new Redis(environment.REDIS_URL, {
    maxRetriesPerRequest: null,
  });
  const queue = new Queue('market-data', {
    connection: redis.duplicate(),
  });
  const rows = await database.loadAssetProviderMappings([
    'binance',
    'coingecko',
    'tcmb-evds',
    'open-exchange-rates',
  ]);

  const byProvider = new Map<string, AssetProviderMapping[]>();
  const assetIds = new Map<string, string>();
  for (const row of rows) {
    const mapped = byProvider.get(row.providerId) ?? [];
    mapped.push(row);
    byProvider.set(row.providerId, mapped);
    const previous = assetIds.get(row.ticker);
    if (previous !== undefined && previous !== row.assetId) {
      throw new Error(
        `Ticker must be unique across mapped assets: ${row.ticker}`,
      );
    }
    assetIds.set(row.ticker, row.assetId);
  }

  const registry = new ProviderRegistry();
  const sources = new Map<ProviderId, string>();
  const pipeline = new MarketQuotePipeline(
    redis,
    database,
    registry,
    sources,
    assetIds,
    logger,
  );
  const recordProviderFailure = (error: ProviderError): void => {
    void pipeline.handleProviderFailure(error).catch(() => {
      logger.error(
        { providerId: error.providerId },
        'Could not record provider health failure',
      );
    });
  };
  const cryptoRows = byProvider.get('binance') ?? [];
  const cryptoInstruments = cryptoRows.map(makeInstrument);
  let binance: BinanceSpotProvider | undefined;
  if (cryptoInstruments.length > 0) {
    const id = await database.registerMarketDataSource({
      name: 'Binance Spot',
      priority: 0,
      attributionText: 'Piyasa verisi: Binance Spot.',
      licenseNote:
        'Spot market data accessed through the public Binance API; subject to Binance terms.',
    });
    const sourceId = parseSourceId(id);
    sources.set(parseProviderId('binance'), id);
    binance = new BinanceSpotProvider(sourceId, cryptoInstruments, {
      onError: (error) => {
        logger.warn(
          { providerId: error.providerId, code: error.code },
          'Binance stream event',
        );
        recordProviderFailure(error);
      },
    });
    registry.register(binance, 0);
  }

  const rateLimiter = new RedisProviderRateLimiter(redis);
  if (
    environment.PROVIDER_CRYPTO_FALLBACK === 'coingecko' &&
    cryptoRows.length > 0
  ) {
    const coingeckoRows = byProvider.get('coingecko') ?? [];
    if (coingeckoRows.length === 0) {
      throw new Error(
        'CoinGecko fallback is enabled but no coingecko symbols are mapped',
      );
    }
    const id = await database.registerMarketDataSource({
      name: 'CoinGecko',
      priority: 1,
      attributionText: 'Powered by CoinGecko',
      licenseNote:
        'Demo API; redis-only cache; operator agreement, visible attribution, and product user agreement/privacy policy are required before external use.',
    });
    sources.set(parseProviderId('coingecko'), id);
    registry.register(
      new CoinGeckoProvider(
        parseSourceId(id),
        coingeckoRows.map(makeInstrument),
        environment.COINGECKO_API_KEY,
        { permit: () => rateLimiter.acquire('coingecko') },
      ),
      10,
    );
    logger.info({ providerId: 'coingecko' }, 'Opt-in crypto fallback enabled');
  }

  const fxRows = byProvider.get('tcmb-evds') ?? [];
  let evds: EvdsProvider | undefined;
  if (fxRows.length > 0 && environment.EVDS_API_KEY !== '') {
    const id = await database.registerMarketDataSource({
      name: 'TCMB EVDS',
      priority: 0,
      attributionText:
        'Kaynak: Türkiye Cumhuriyet Merkez Bankası (TCMB), EVDS.',
      licenseNote:
        'Official daily reference exchange-rate observations from TCMB EVDS.',
    });
    sources.set(parseProviderId('tcmb-evds'), id);
    evds = new EvdsProvider(
      parseSourceId(id),
      fxRows.map(makeInstrument),
      environment.EVDS_API_KEY,
    );
    registry.register(evds, 0);
    logger.info(
      { providerId: 'tcmb-evds', instruments: fxRows.length },
      'Official FX provider enabled',
    );
  } else if (fxRows.length > 0) {
    logger.warn(
      { providerId: 'tcmb-evds' },
      'EVDS disabled because EVDS_API_KEY is empty',
    );
  }

  const openExchangeRows = byProvider.get('open-exchange-rates') ?? [];
  let openExchangeRates: OpenExchangeRatesProvider | undefined;
  if (
    openExchangeRows.length > 0 &&
    environment.OPEN_EXCHANGE_RATES_APP_ID !== ''
  ) {
    const id = await database.registerMarketDataSource({
      name: 'Open Exchange Rates',
      priority: 100,
      attributionText:
        'Kaynak: Open Exchange Rates; saatlik gösterge niteliğinde kur tahmini.',
      licenseNote:
        'Forever Free plan: small-scale/open-source eligibility, USD base, hourly indicative midpoint estimates, 1,000 monthly requests; no precise FX trading or direct resale.',
    });
    sources.set(parseProviderId('open-exchange-rates'), id);
    openExchangeRates = new OpenExchangeRatesProvider(
      parseSourceId(id),
      openExchangeRows.map(makeInstrument),
      environment.OPEN_EXCHANGE_RATES_APP_ID,
      { permit: () => rateLimiter.acquire('open-exchange-rates') },
    );
    registry.register(openExchangeRates, 100);
    logger.info(
      {
        providerId: 'open-exchange-rates',
        instruments: openExchangeRows.length,
      },
      'Indicative FX estimate provider enabled',
    );
  } else if (openExchangeRows.length > 0) {
    logger.warn(
      { providerId: 'open-exchange-rates' },
      'Open Exchange Rates disabled because its App ID is empty',
    );
  }

  await pipeline.hydrateCachedEvents(assetIds.keys());

  const worker = new Worker(
    'market-data',
    async (job) => {
      if (job.name === 'crypto-fallback-poll') {
        await pipeline.publishFallbackCrypto(
          cryptoRows.map((row) => row.ticker),
        );
      } else if (job.name === 'stale-audit') {
        await pipeline.markStaleQuotes();
      } else if (job.name === 'evds-daily' && evds !== undefined) {
        await pipeline.refreshEvds(
          evds,
          fxRows.map((row) => row.ticker),
        );
      } else if (
        job.name === 'open-exchange-rates-hourly' &&
        openExchangeRates !== undefined
      ) {
        await pipeline.refreshOpenExchangeRates(
          openExchangeRates,
          openExchangeRows.map((row) => row.ticker),
        );
      }
    },
    {
      connection: redis.duplicate(),
      concurrency: 2,
    },
  );

  if (cryptoRows.length > 0) {
    await queue.upsertJobScheduler(
      'crypto-fallback-poll',
      { every: 5_000 },
      {
        name: 'crypto-fallback-poll',
        data: {},
        opts: { attempts: 6, backoff: { type: 'exponential', delay: 1_000 } },
      },
    );
    if (binance !== undefined) {
      const tickerList = cryptoRows.map((row) => parseTicker(row.ticker));
      binance.subscribe(tickerList, (quote) => {
        void pipeline.ingest(quote.ticker).catch((error: unknown) =>
          logger.warn(
            {
              ticker: quote.ticker,
              errorCode:
                error instanceof ProviderError ? error.code : 'internal',
            },
            'Could not publish Binance quote',
          ),
        );
      });
    }
  }
  if (evds !== undefined) {
    await queue.upsertJobScheduler(
      'evds-daily',
      { pattern: '0 18 * * 1-5', tz: 'Europe/Istanbul' },
      {
        name: 'evds-daily',
        data: {},
        opts: { attempts: 6, backoff: { type: 'exponential', delay: 1_000 } },
      },
    );
  }
  if (openExchangeRates !== undefined) {
    await queue.upsertJobScheduler(
      'open-exchange-rates-hourly',
      { pattern: '5 * * * *', tz: 'UTC' },
      {
        name: 'open-exchange-rates-hourly',
        data: {},
        opts: { attempts: 2, backoff: { type: 'exponential', delay: 5_000 } },
      },
    );
    void pipeline
      .refreshOpenExchangeRates(
        openExchangeRates,
        openExchangeRows.map((row) => row.ticker),
      )
      .catch((error: unknown) =>
        logger.warn(
          {
            providerId: 'open-exchange-rates',
            errorCode: error instanceof ProviderError ? error.code : 'internal',
          },
          'Initial FX estimate refresh failed',
        ),
      );
  }
  if (assetIds.size > 0) {
    await queue.upsertJobScheduler(
      'stale-audit',
      { every: 5_000 },
      {
        name: 'stale-audit',
        data: {},
        opts: { attempts: 6, backoff: { type: 'exponential', delay: 1_000 } },
      },
    );
  }
  await worker.waitUntilReady();
  await redis.ping();
  await database.query('SELECT 1');
  logger.info(
    {
      cryptoInstruments: cryptoInstruments.length,
      fxInstruments: fxRows.length + openExchangeRows.length,
      providers: [...sources.keys()],
    },
    'Market-data worker ready',
  );

  return {
    close: async () => {
      binance?.close();
      await worker.close();
      await queue.close();
      await redis.quit();
      await database.close();
    },
  };
}
