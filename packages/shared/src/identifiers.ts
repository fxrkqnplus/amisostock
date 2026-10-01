import { z } from 'zod';

declare const tickerBrand: unique symbol;
declare const currencyBrand: unique symbol;
declare const providerBrand: unique symbol;
declare const sourceBrand: unique symbol;
declare const signalBrand: unique symbol;

export type Ticker = string & { readonly [tickerBrand]: true };
export type IsoCurrency<Code extends string = string> = Code & {
  readonly [currencyBrand]: true;
};
export type ProviderId = string & { readonly [providerBrand]: true };
export type SourceId = string & { readonly [sourceBrand]: true };
export type SignalId = string & { readonly [signalBrand]: true };

const isoCurrencies = new Set([
  ...Intl.supportedValuesOf('currency'),
  // ISO 4217 precious-metal codes are omitted by some ICU currency lists.
  'XAU',
  'XAG',
  'XPT',
  'XPD',
]);
const uuidSchema = z.uuid();

export const tickerSchema = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[A-Z0-9]+(?:[./-][A-Z0-9]+)*$/)
  .transform((value): Ticker => value as Ticker);

export const isoCurrencySchema = z
  .string()
  .regex(/^[A-Z]{3}$/)
  .refine((value) => isoCurrencies.has(value))
  .transform((value): IsoCurrency => value as IsoCurrency);

export const providerIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)
  .refine((value) => !uuidSchema.safeParse(value).success)
  .transform((value): ProviderId => value as ProviderId);

// Registry adapters have slug ProviderIds; persisted sources use UUID primary keys.
export const sourceIdSchema = uuidSchema.transform(
  (value): SourceId => value as SourceId,
);

export const signalIdSchema = uuidSchema.transform(
  (value): SignalId => value as SignalId,
);

export function parseTicker(input: unknown): Ticker {
  return tickerSchema.parse(input);
}

export function parseIsoCurrency<const Code extends string>(
  input: Code,
): IsoCurrency<Code>;
export function parseIsoCurrency(input: unknown): IsoCurrency;
export function parseIsoCurrency(input: unknown): IsoCurrency {
  return isoCurrencySchema.parse(input);
}

export function parseProviderId(input: unknown): ProviderId {
  return providerIdSchema.parse(input);
}

export function parseSourceId(input: unknown): SourceId {
  return sourceIdSchema.parse(input);
}

export function parseSignalId(input: unknown): SignalId {
  return signalIdSchema.parse(input);
}
