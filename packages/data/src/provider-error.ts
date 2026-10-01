import type { ProviderId } from '@amisostock/shared';

export type ProviderErrorCode =
  'invalid-response' | 'unavailable' | 'rate-limited' | 'unsupported';

export type ProviderErrorOptions = Readonly<{
  cause?: unknown;
  code: ProviderErrorCode;
  retryAfterMs?: number;
}>;

export class ProviderError extends Error {
  readonly providerId: ProviderId;
  readonly code: ProviderErrorCode;
  readonly retryAfterMs: number | undefined;

  constructor(
    providerId: ProviderId,
    message: string,
    options: ProviderErrorOptions,
  ) {
    super(message, { cause: options.cause });
    this.name = 'ProviderError';
    this.providerId = providerId;
    this.code = options.code;
    this.retryAfterMs = options.retryAfterMs;
  }
}
