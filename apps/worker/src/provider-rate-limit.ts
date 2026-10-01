import { parseProviderId, type ProviderId } from '@amisostock/shared';
import type { Redis as RedisClient } from 'ioredis';
import { ProviderError } from '@amisostock/data';

const COINGECKO_LIMIT_SCRIPT = `
local minuteCount = tonumber(redis.call('GET', KEYS[1]) or '0')
local monthCount = tonumber(redis.call('GET', KEYS[2]) or '0')
local minuteLimit = tonumber(ARGV[1])
local monthLimit = tonumber(ARGV[2])
if minuteCount >= minuteLimit or monthCount >= monthLimit then
  local minuteTtl = minuteCount >= minuteLimit and redis.call('TTL', KEYS[1]) or 0
  local monthTtl = monthCount >= monthLimit and redis.call('TTL', KEYS[2]) or 0
  return {0, math.max(minuteTtl, monthTtl)}
end
minuteCount = redis.call('INCR', KEYS[1])
if minuteCount == 1 then redis.call('EXPIRE', KEYS[1], ARGV[3]) end
monthCount = redis.call('INCR', KEYS[2])
if monthCount == 1 then redis.call('EXPIRE', KEYS[2], ARGV[4]) end
return {1, minuteCount, monthCount}
`;

export interface RedisScriptClient {
  eval(
    script: string,
    numberOfKeys: number,
    ...args: Array<string | number>
  ): Promise<unknown>;
}

function resetWindows(now: Date): Readonly<{
  minute: string;
  minuteTtl: number;
  month: string;
  monthTtl: number;
}> {
  const minuteStart = Math.floor(now.getTime() / 60_000) * 60_000;
  const nextMinute = minuteStart + 60_000;
  const nextMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  return {
    minute: new Date(minuteStart).toISOString().slice(0, 16),
    minuteTtl: Math.max(1, Math.ceil((nextMinute - now.getTime()) / 1_000)),
    month: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`,
    monthTtl: Math.max(1, Math.ceil((nextMonth - now.getTime()) / 1_000)),
  };
}

export class RedisProviderRateLimiter {
  constructor(
    private readonly redis: RedisScriptClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async acquire(providerIdInput: ProviderId | string): Promise<void> {
    const providerId = parseProviderId(providerIdInput);
    if (providerId !== 'coingecko') return;
    const now = this.now();
    const windows = resetWindows(now);
    const minuteKey = `provider-quota:${providerId}:minute:${windows.minute}`;
    const monthKey = `provider-quota:${providerId}:month:${windows.month}`;
    const result = await this.redis.eval(
      COINGECKO_LIMIT_SCRIPT,
      2,
      minuteKey,
      monthKey,
      100,
      10_000,
      windows.minuteTtl,
      windows.monthTtl,
    );
    if (!Array.isArray(result) || result[0] !== 1) {
      const retrySeconds = Array.isArray(result) ? Number(result[1]) : 60;
      throw new ProviderError(providerId, 'CoinGecko quota is exhausted', {
        code: 'rate-limited',
        retryAfterMs: Math.max(1, retrySeconds) * 1_000,
      });
    }
  }
}

export function createRedisProviderRateLimiter(redis: RedisClient) {
  return new RedisProviderRateLimiter(redis);
}
