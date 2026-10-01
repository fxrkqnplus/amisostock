import { describe, expect, it } from 'vitest';
import { parseQuote } from './market-data.js';

const timestamp = '2026-09-30T12:00:00Z';
const sourceId = 'f36625f5-813a-4335-8f22-004b06e3d113';
const noData = { kind: 'no-data' } as const;
const stale = {
  kind: 'stale',
  source: sourceId,
  asOf: timestamp,
} as const;

function validQuote() {
  return {
    ticker: 'BTC-USDT',
    price: {
      kind: 'value',
      data: {
        value: { amount: '75000.123456', currency: 'USD' },
        source: sourceId,
        asOf: timestamp,
        freshness: 'delayed',
        delayMinutes: 15,
      },
    },
    changeAbs: noData,
    changePct: noData,
    dayHigh: noData,
    dayLow: noData,
    volume: noData,
  };
}

describe('quote display states', () => {
  it('keeps a delayed price with its source, timestamp and known delay', () => {
    const quote = parseQuote(validQuote());
    expect(quote.ticker).toBe('BTC-USDT');
    if (quote.price.kind !== 'value') throw new Error('Expected a price');
    expect(quote.price.data.value.amount.toFixed(6)).toBe('75000.123456');
    expect(quote.price.data.source).toBe(sourceId);
    expect(quote.price.data.asOf.toISOString()).toBe(
      '2026-09-30T12:00:00.000Z',
    );
    expect(quote.price.data.freshness).toBe('delayed');
    if (quote.price.data.freshness !== 'delayed') {
      throw new Error('Expected a delayed price');
    }
    expect(quote.price.data.delayMinutes).toBe(15);
  });

  it('accepts matching currency metrics and exact decimal percentage and volume', () => {
    const quote = validQuote();
    const parsed = parseQuote({
      ...quote,
      dayHigh: {
        ...quote.price,
        data: {
          ...quote.price.data,
          value: { amount: '76000', currency: 'USD' },
        },
      },
      changePct: {
        kind: 'value',
        data: {
          value: '-0.125',
          source: sourceId,
          asOf: timestamp,
          freshness: 'estimate',
        },
      },
      volume: {
        kind: 'value',
        data: {
          value: '123456789.123456789',
          source: sourceId,
          asOf: timestamp,
          freshness: 'live',
        },
      },
    });
    if (parsed.changePct.kind !== 'value' || parsed.volume.kind !== 'value') {
      throw new Error('Expected numeric metrics');
    }
    expect(parsed.changePct.data.value.toString()).toBe('-0.125');
    expect(parsed.volume.data.value.toString()).toBe('123456789.123456789');
  });

  it('represents no-data and stale states without a numeric value', () => {
    const quote = parseQuote({
      ...validQuote(),
      price: stale,
      dayHigh: noData,
    });
    expect(quote.price.kind).toBe('stale');
    expect('data' in quote.price).toBe(false);
    expect(quote.dayHigh.kind).toBe('no-data');
    expect('data' in quote.dayHigh).toBe(false);
  });

  it.each(['live', 'close', 'estimate'])(
    'accepts %s values without a delay duration',
    (freshness) => {
      const quote = validQuote();
      const { delayMinutes: removed, ...data } = quote.price.data;
      void removed;
      expect(() =>
        parseQuote({
          ...quote,
          price: { kind: 'value', data: { ...data, freshness } },
        }),
      ).not.toThrow();
    },
  );

  it('does not allow delay metadata on a live value', () => {
    const quote = validQuote();
    expect(() =>
      parseQuote({
        ...quote,
        price: {
          ...quote.price,
          data: { ...quote.price.data, freshness: 'live' },
        },
      }),
    ).toThrow();
  });

  it.each([
    { field: 'source', replacement: undefined },
    { field: 'asOf', replacement: undefined },
    { field: 'freshness', replacement: undefined },
    { field: 'delayMinutes', replacement: undefined },
    { field: 'delayMinutes', replacement: 0 },
    { field: 'asOf', replacement: '2026-09-30T12:00:00' },
  ])(
    'rejects invalid display metadata: $field=$replacement',
    ({ field, replacement }) => {
      const quote = validQuote();
      expect(() =>
        parseQuote({
          ...quote,
          price: {
            ...quote.price,
            data: { ...quote.price.data, [field]: replacement },
          },
        }),
      ).toThrow();
    },
  );

  it('rejects a stale datum that leaks its old price', () => {
    expect(() =>
      parseQuote({
        ...validQuote(),
        price: { ...stale, data: validQuote().price.data },
      }),
    ).toThrow();
  });

  it('rejects an unsourced bare price and a no-data state carrying a value', () => {
    expect(() =>
      parseQuote({ ...validQuote(), price: { amount: '1', currency: 'USD' } }),
    ).toThrow();
    expect(() =>
      parseQuote({
        ...validQuote(),
        price: { ...noData, data: validQuote().price.data },
      }),
    ).toThrow();
  });

  it('rejects adapter slugs in persisted source fields', () => {
    const quote = validQuote();
    expect(() =>
      parseQuote({
        ...quote,
        price: {
          ...quote.price,
          data: { ...quote.price.data, source: 'binance' },
        },
      }),
    ).toThrow();
    expect(() =>
      parseQuote({ ...quote, price: { ...stale, source: 'binance' } }),
    ).toThrow();
  });

  it('rejects inconsistent monetary currencies in one quote', () => {
    const quote = validQuote();
    expect(() =>
      parseQuote({
        ...quote,
        dayHigh: {
          ...quote.price,
          data: {
            ...quote.price.data,
            value: { amount: '76000', currency: 'TRY' },
          },
        },
      }),
    ).toThrow('Quote monetary fields must use one currency');
  });

  it('requires each quote field to carry an explicit display state', () => {
    const { volume: omitted, ...quote } = validQuote();
    void omitted;
    expect(() => parseQuote(quote)).toThrow();
  });
});
