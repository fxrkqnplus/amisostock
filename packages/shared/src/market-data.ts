import { Decimal } from 'decimal.js';
import { z } from 'zod';
import {
  sourceIdSchema,
  tickerSchema,
  type SourceId,
  type Ticker,
} from './identifiers.js';
import { moneySchema, type Money } from './money.js';

export const freshnessSchema = z.enum(['live', 'delayed', 'close', 'estimate']);
export type Freshness = z.infer<typeof freshnessSchema>;

type ValueBase<T> = Readonly<{
  value: T;
  source: SourceId;
  asOf: Date;
}>;

export type DisplayValue<T> =
  | (ValueBase<T> & {
      readonly freshness: 'delayed';
      readonly delayMinutes: number;
    })
  | (ValueBase<T> & {
      readonly freshness: Exclude<Freshness, 'delayed'>;
      readonly delayMinutes?: never;
    });

// No-data and stale replace the value: neither variant exposes a number to the UI.
export type DisplayDatum<T> =
  | Readonly<{ kind: 'value'; data: DisplayValue<T> }>
  | Readonly<{ kind: 'no-data' }>
  | Readonly<{ kind: 'stale'; source: SourceId; asOf: Date }>;

export type Quote<Code extends string = string> = Readonly<{
  ticker: Ticker;
  price: DisplayDatum<Money<Code>>;
  changeAbs: DisplayDatum<Money<Code>>;
  changePct: DisplayDatum<Decimal>;
  dayHigh: DisplayDatum<Money<Code>>;
  dayLow: DisplayDatum<Money<Code>>;
  volume: DisplayDatum<Decimal>;
}>;

const timestampSchema = z.union([
  z.date(),
  z.iso.datetime({ offset: true }).transform((value) => new Date(value)),
]);

export const decimalValueSchema = z
  .string()
  .regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/)
  .transform((value) => new Decimal(value));

function sourcedValueSchema<ValueSchema extends z.ZodType>(
  valueSchema: ValueSchema,
) {
  const sharedFields = {
    source: sourceIdSchema,
    asOf: timestampSchema,
  };
  return z.discriminatedUnion('freshness', [
    z
      .object({
        ...sharedFields,
        value: valueSchema,
        freshness: z.literal('live'),
      })
      .strict(),
    z
      .object({
        ...sharedFields,
        value: valueSchema,
        freshness: z.literal('delayed'),
        delayMinutes: z.number().int().positive(),
      })
      .strict(),
    z
      .object({
        ...sharedFields,
        value: valueSchema,
        freshness: z.literal('close'),
      })
      .strict(),
    z
      .object({
        ...sharedFields,
        value: valueSchema,
        freshness: z.literal('estimate'),
      })
      .strict(),
  ]);
}

function datumSchema<ValueSchema extends z.ZodType>(valueSchema: ValueSchema) {
  return z.discriminatedUnion('kind', [
    z
      .object({
        kind: z.literal('value'),
        data: sourcedValueSchema(valueSchema),
      })
      .strict(),
    z.object({ kind: z.literal('no-data') }).strict(),
    z
      .object({
        kind: z.literal('stale'),
        source: sourceIdSchema,
        asOf: timestampSchema,
      })
      .strict(),
  ]);
}

export {
  sourcedValueSchema as displayValueSchema,
  datumSchema as displayDatumSchema,
};

const monetaryDatumSchema = datumSchema(moneySchema);
const decimalDatumSchema = datumSchema(decimalValueSchema);

export const quoteSchema = z
  .object({
    ticker: tickerSchema,
    price: monetaryDatumSchema,
    changeAbs: monetaryDatumSchema,
    changePct: decimalDatumSchema,
    dayHigh: monetaryDatumSchema,
    dayLow: monetaryDatumSchema,
    volume: decimalDatumSchema,
  })
  .strict()
  .superRefine((quote, context) => {
    const currencyFields = ['price', 'changeAbs', 'dayHigh', 'dayLow'] as const;
    let currency: string | undefined;
    for (const field of currencyFields) {
      const datum = quote[field];
      if (datum.kind !== 'value') continue;
      if (currency === undefined) currency = datum.data.value.currency;
      else if (datum.data.value.currency !== currency) {
        context.addIssue({
          code: 'custom',
          path: [field, 'data', 'value', 'currency'],
          message: 'Quote monetary fields must use one currency',
        });
      }
    }
  });

export function parseQuote(input: unknown): Quote {
  return quoteSchema.parse(input);
}
