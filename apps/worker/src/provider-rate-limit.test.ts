import { describe, expect, it } from 'vitest';
import { ProviderError } from '@amisostock/data';
import { parseMarketDataWorkerEnvironment } from './market-data-runtime.js';
import {
  RedisProviderRateLimiter,
  type RedisScriptClient,
} from './provider-rate-limit.js';

class FakeRedisScriptClient implements RedisScriptClient {
  calls: Array<Readonly<{ args: Array<string | number>; keys: number }>> = [];
  result: unknown = [1, 1, 1];

  async eval(
    _script: string,
    numberOfKeys: number,
    ...args: Array<string | number>
  ): Promise<unknown> {
    this.calls.push({ args, keys: numberOfKeys });
    return this.result;
  }
}

describe('Redis provider quota limiter', () => {
  it('atomically checks minute and monthly CoinGecko windows without using the key', async () => {
    const redis = new FakeRedisScriptClient();
    const limiter = new RedisProviderRateLimiter(
      redis,
      () => new Date('2026-10-01T12:30:00.000Z'),
    );
    await limiter.acquire('coingecko');
    expect(redis.calls).toHaveLength(1);
    expect(redis.calls[0]?.keys).toBe(2);
    expect(String(redis.calls[0]?.args[0])).toContain(
      'provider-quota:coingecko:minute',
    );
    expect(String(redis.calls[0]?.args[1])).toContain(
      'provider-quota:coingecko:month:2026-10',
    );
    expect(redis.calls[0]?.args).not.toContain('api-key');
  });

  it('turns exhausted quota into a bounded rate-limited ProviderError', async () => {
    const redis = new FakeRedisScriptClient();
    redis.result = [0, 45];
    const limiter = new RedisProviderRateLimiter(redis);
    await expect(limiter.acquire('coingecko')).rejects.toMatchObject({
      providerId: 'coingecko',
      code: 'rate-limited',
      retryAfterMs: 45_000,
    });
    await expect(limiter.acquire('coingecko')).rejects.toBeInstanceOf(
      ProviderError,
    );
  });

  it('does not impose the CoinGecko quota on unrelated providers', async () => {
    const redis = new FakeRedisScriptClient();
    await new RedisProviderRateLimiter(redis).acquire('binance');
    expect(redis.calls).toHaveLength(0);
  });

  it('caps Open Exchange Rates below its published monthly allowance', async () => {
    const redis = new FakeRedisScriptClient();
    const limiter = new RedisProviderRateLimiter(
      redis,
      () => new Date('2026-10-01T12:30:00.000Z'),
    );
    await limiter.acquire('open-exchange-rates');
    expect(redis.calls).toHaveLength(1);
    expect(redis.calls[0]?.keys).toBe(1);
    expect(String(redis.calls[0]?.args[0])).toContain(
      'provider-quota:open-exchange-rates:month:2026-10',
    );
    expect(redis.calls[0]?.args[1]).toBe(900);
    expect(redis.calls[0]?.args).not.toContain('api-key');
  });

  it('turns the Open Exchange Rates monthly guard into a rate-limited error', async () => {
    const redis = new FakeRedisScriptClient();
    redis.result = [0, 3_600];
    await expect(
      new RedisProviderRateLimiter(redis).acquire('open-exchange-rates'),
    ).rejects.toMatchObject({
      providerId: 'open-exchange-rates',
      code: 'rate-limited',
      retryAfterMs: 3_600_000,
    });
  });
});

describe('worker environment', () => {
  const base = {
    DATABASE_URL: 'postgresql://worker:secret@localhost:5432/amisostock',
    REDIS_URL: 'redis://localhost:6379/1',
  };

  it('leaves CoinGecko off unless its server key is configured', () => {
    expect(
      parseMarketDataWorkerEnvironment(base).PROVIDER_CRYPTO_FALLBACK,
    ).toBe('');
    expect(() =>
      parseMarketDataWorkerEnvironment({
        ...base,
        PROVIDER_CRYPTO_FALLBACK: 'coingecko',
      }),
    ).toThrow('COINGECKO_API_KEY');
    expect(
      parseMarketDataWorkerEnvironment({
        ...base,
        PROVIDER_CRYPTO_FALLBACK: 'coingecko',
        COINGECKO_API_KEY: 'not-logged',
      }).PROVIDER_CRYPTO_FALLBACK,
    ).toBe('coingecko');
  });

  it('accepts the optional server-side Open Exchange Rates App ID', () => {
    expect(
      parseMarketDataWorkerEnvironment(base).OPEN_EXCHANGE_RATES_APP_ID,
    ).toBe('');
    expect(
      parseMarketDataWorkerEnvironment({
        ...base,
        OPEN_EXCHANGE_RATES_APP_ID: 'server-only-app-id',
      }).OPEN_EXCHANGE_RATES_APP_ID,
    ).toBe('server-only-app-id');
  });

  it('reports missing fields without echoing connection strings', () => {
    expect(() =>
      parseMarketDataWorkerEnvironment({
        REDIS_URL: base.REDIS_URL,
      }),
    ).toThrow('DATABASE_URL');
    expect(() =>
      parseMarketDataWorkerEnvironment({
        REDIS_URL: base.REDIS_URL,
      }),
    ).not.toThrow('secret');
  });
});
