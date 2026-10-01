import { Decimal } from 'decimal.js';
import { z } from 'zod';
import { currencyCodeSchema, type CurrencyCode } from './identifiers.js';

export type Money<Code extends string = string> = Readonly<{
  amount: Decimal;
  currency: CurrencyCode<Code>;
}>;

// The database stores numeric(20,6): 14 integer and at most 6 fractional digits.
const NUMERIC_TEXT = /^-?(?:0|[1-9]\d*)(?:\.\d{1,6})?$/;
const ExactDecimal = Decimal.clone({ precision: 40 });

const numeric20_6Schema = z
  .string()
  .regex(NUMERIC_TEXT)
  .refine((text) => {
    const unsigned = text.startsWith('-') ? text.slice(1) : text;
    const decimalPoint = unsigned.indexOf('.');
    return (decimalPoint < 0 ? unsigned.length : decimalPoint) <= 14;
  })
  .transform((text) => new ExactDecimal(text));

const wireSchema = z
  .object({
    amount: numeric20_6Schema,
    currency: currencyCodeSchema,
  })
  .strict();

export { numeric20_6Schema as moneyAmountSchema, wireSchema as moneySchema };

export function createMoney<const Code extends string>(
  amount: string | Decimal,
  currency: CurrencyCode<Code>,
): Money<Code> {
  const text: unknown = Decimal.isDecimal(amount) ? amount.toString() : amount;
  return {
    amount: numeric20_6Schema.parse(text),
    currency: currencyCodeSchema.parse(currency) as CurrencyCode<Code>,
  };
}

export function parseMoney(input: unknown): Money {
  return wireSchema.parse(input);
}

function assertSameCurrency(left: Money, right: Money): void {
  if (left.currency !== right.currency) {
    throw new TypeError(
      `Currency mismatch: ${left.currency} and ${right.currency}; convert with an exchange rate first.`,
    );
  }
}

export function addMoney<const Code extends string>(
  left: Money<Code>,
  right: Money<NoInfer<Code>>,
): Money<Code> {
  assertSameCurrency(left, right);
  return createMoney(left.amount.plus(right.amount), left.currency);
}

export function subtractMoney<const Code extends string>(
  left: Money<Code>,
  right: Money<NoInfer<Code>>,
): Money<Code> {
  assertSameCurrency(left, right);
  return createMoney(left.amount.minus(right.amount), left.currency);
}
