import {
  parseQuote,
  parseProviderId,
  type DisplayDatum,
  type ProviderId,
  type Quote,
  type Ticker,
} from '@amisostock/shared';
import { ProviderError } from './provider-error.js';
import type { MarketDataProvider } from './provider-contract.js';

export type ResolvedQuote = Readonly<{
  attributionText: string | null;
  persist: boolean;
  providerId: ProviderId;
  quote: Quote;
}>;

type RegistryEntry = Readonly<{
  provider: MarketDataProvider;
  priority: number;
}>;

function valueSource<Value>(datum: DisplayDatum<Value>): string | undefined {
  if (datum.kind === 'value') return datum.data.source;
  return datum.kind === 'stale' ? datum.source : undefined;
}

function providerError(error: unknown, providerId: ProviderId): ProviderError {
  if (error instanceof ProviderError) return error;
  return new ProviderError(providerId, 'Provider request failed', {
    code: 'unavailable',
    cause: error,
  });
}

function assertProviderQuote(
  input: unknown,
  ticker: Ticker,
  provider: MarketDataProvider,
): Quote {
  let quote: Quote;
  try {
    quote = parseQuote(JSON.parse(JSON.stringify(input)) as unknown);
  } catch (error) {
    throw new ProviderError(provider.id, 'Provider returned an invalid quote', {
      code: 'invalid-response',
      cause: error,
    });
  }
  if (
    quote.ticker !== ticker ||
    (quote.price.kind !== 'value' && quote.price.kind !== 'stale')
  ) {
    throw new ProviderError(provider.id, 'Provider quote is incomplete', {
      code: 'invalid-response',
    });
  }
  const sources = [
    valueSource(quote.price),
    valueSource(quote.changeAbs),
    valueSource(quote.changePct),
    valueSource(quote.dayHigh),
    valueSource(quote.dayLow),
    valueSource(quote.volume),
  ].filter((source): source is string => source !== undefined);
  if (sources.some((source) => source !== provider.sourceId)) {
    throw new ProviderError(provider.id, 'Provider quote mixed source ids', {
      code: 'invalid-response',
    });
  }
  return quote;
}

export class ProviderRegistry {
  private readonly entries: RegistryEntry[] = [];

  register(provider: MarketDataProvider, priority: number): void {
    if (!Number.isInteger(priority) || priority < 0) {
      throw new RangeError('Provider priority must be a non-negative integer');
    }
    if (this.entries.some((entry) => entry.provider.id === provider.id)) {
      throw new Error(`Provider already registered: ${provider.id}`);
    }
    this.entries.push({ provider, priority });
    this.entries.sort((left, right) => left.priority - right.priority);
  }

  providersFor(ticker: Ticker): readonly MarketDataProvider[] {
    return this.entries
      .filter((entry) => entry.provider.supports(ticker))
      .map((entry) => entry.provider);
  }

  async getQuoteFromProvider(
    providerIdInput: ProviderId | string,
    ticker: Ticker,
  ): Promise<ResolvedQuote> {
    const providerId = parseProviderId(providerIdInput);
    const provider = this.entries.find(
      (entry) => entry.provider.id === providerId,
    )?.provider;
    if (provider === undefined || !provider.supports(ticker)) {
      throw new ProviderError(providerId, 'Provider does not support ticker', {
        code: 'unsupported',
      });
    }
    try {
      const quote = assertProviderQuote(
        await provider.getQuote(ticker),
        ticker,
        provider,
      );
      return {
        attributionText: provider.attributionText,
        persist: provider.storagePolicy === 'database',
        providerId: provider.id,
        quote,
      };
    } catch (error) {
      throw providerError(error, provider.id);
    }
  }

  async getQuote(
    ticker: Ticker,
    skipProviders: ReadonlySet<ProviderId> = new Set(),
  ): Promise<ResolvedQuote> {
    const candidates = this.entries.filter(
      (entry) =>
        entry.provider.supports(ticker) &&
        !skipProviders.has(entry.provider.id),
    );
    if (candidates.length === 0) {
      throw new ProviderError(
        parseProviderId('registry'),
        'No provider supports ticker',
        {
          code: 'unsupported',
        },
      );
    }

    let lastRetryableError: ProviderError | undefined;
    for (const { provider } of candidates) {
      try {
        const quote = assertProviderQuote(
          await provider.getQuote(ticker),
          ticker,
          provider,
        );
        return {
          attributionText: provider.attributionText,
          persist: provider.storagePolicy === 'database',
          providerId: provider.id,
          quote,
        };
      } catch (caught) {
        const error = providerError(caught, provider.id);
        if (error.code === 'invalid-response' || error.code === 'unsupported') {
          throw error;
        }
        lastRetryableError = error;
      }
    }

    throw (
      lastRetryableError ??
      new ProviderError(
        parseProviderId('registry'),
        'No provider returned a quote',
        {
          code: 'unavailable',
        },
      )
    );
  }
}
