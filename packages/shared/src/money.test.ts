import { Decimal } from 'decimal.js';
import { describe, expect, it } from 'vitest';
import { parseIsoCurrency } from './identifiers.js';
import { addMoney, createMoney, parseMoney, subtractMoney } from './money.js';

const tryCurrency = parseIsoCurrency('TRY');
const usdCurrency = parseIsoCurrency('USD');

describe('money', () => {
  it('adds decimal amounts exactly and preserves currency', () => {
    const sum = addMoney(
      createMoney('0.10', tryCurrency),
      createMoney('0.20', tryCurrency),
    );
    expect(sum.amount.toFixed(2)).toBe('0.30');
    expect(sum.currency).toBe('TRY');
  });

  it('subtracts without floating-point error', () => {
    const result = subtractMoney(
      createMoney('1.00', tryCurrency),
      createMoney(new Decimal('0.70'), tryCurrency),
    );
    expect(result.amount.toFixed(2)).toBe('0.30');
  });

  it('rejects a currency mismatch even if callers evade the type system', () => {
    const lira = createMoney('1', tryCurrency);
    const dollars = createMoney('2', usdCurrency);
    expect(() => addMoney(lira, dollars as unknown as typeof lira)).toThrow(
      'Currency mismatch',
    );
  });

  it.each(['0.0000001', '100000000000000', '1e3', '1,000.00', 'Infinity'])(
    'rejects an amount outside numeric(20,6): %s',
    (amount) => {
      expect(() => createMoney(amount, tryCurrency)).toThrow();
    },
  );

  it('rejects JavaScript number input at runtime', () => {
    expect(() => createMoney(0.1 as unknown as string, tryCurrency)).toThrow();
    expect(() => parseMoney({ amount: 0.1, currency: 'TRY' })).toThrow();
  });

  it('parses a monetary value from an untrusted object', () => {
    const money = parseMoney({ amount: '-12.345678', currency: 'TRY' });
    expect(money.amount.toFixed(6)).toBe('-12.345678');
    expect(money.currency).toBe('TRY');
    expect(() => parseMoney({ amount: '1', currency: 'ZZZ' })).toThrow();
    expect(() =>
      parseMoney({ amount: '1', currency: 'TRY', ignored: true }),
    ).toThrow();
  });

  it('rejects arithmetic overflow beyond numeric(20,6)', () => {
    const max = createMoney('99999999999999.999999', tryCurrency);
    expect(() => addMoney(max, createMoney('0.000001', tryCurrency))).toThrow();
  });
});
