import { Decimal } from 'decimal.js';
import {
  addMoney,
  createMoney,
  parseIsoCurrency,
  parseProviderId,
  parseSourceId,
  type DisplayDatum,
  type DisplayValue,
  type IsoCurrency,
  type Money,
  type Quote,
} from '../src/index.js';

const tryCurrency = parseIsoCurrency('TRY');
const usdCurrency = parseIsoCurrency('USD');
const tryMoney = createMoney('0.10', tryCurrency);
const usdMoney = createMoney('0.20', usdCurrency);
const validSum: Money<'TRY'> = addMoney(tryMoney, tryMoney);
void validSum;
const persistedSourceId = parseSourceId('f36625f5-813a-4335-8f22-004b06e3d113');
const adapterId = parseProviderId('binance');

// @ts-expect-error Adapter IDs are not database source IDs.
const sourceFromAdapter: DisplayValue<Decimal>['source'] = adapterId;
void sourceFromAdapter;

// @ts-expect-error Money never accepts JavaScript floating-point input.
createMoney(0.1, tryCurrency);

// @ts-expect-error Different currencies require an explicit exchange rate.
addMoney(tryMoney, usdMoney);

// @ts-expect-error A raw string must be parsed before it is an ISO currency.
const unvalidatedCurrency: IsoCurrency<'TRY'> = 'TRY';
void unvalidatedCurrency;

// @ts-expect-error Source is mandatory for every displayed number.
const withoutSource: DisplayValue<Decimal> = {
  value: new Decimal('1'),
  asOf: new Date(),
  freshness: 'live',
};
void withoutSource;

// @ts-expect-error Freshness is mandatory for every displayed number.
const withoutFreshness: DisplayValue<Decimal> = {
  value: new Decimal('1'),
  source: persistedSourceId,
  asOf: new Date(),
};
void withoutFreshness;

// @ts-expect-error Delayed data must state the known delay.
const delayedWithoutMinutes: DisplayValue<Decimal> = {
  value: new Decimal('1'),
  source: persistedSourceId,
  asOf: new Date(),
  freshness: 'delayed',
};
void delayedWithoutMinutes;

const staleWithValue: DisplayDatum<Decimal> = {
  kind: 'stale',
  source: persistedSourceId,
  asOf: new Date(),
  // @ts-expect-error A stale state does not expose its old numeric value.
  value: new Decimal('1'),
};
void staleWithValue;

// @ts-expect-error A quote cannot omit the price state.
const quoteWithoutPrice: Quote<'TRY'> = {
  ticker: 'THYAO' as Quote<'TRY'>['ticker'],
  changeAbs: { kind: 'no-data' },
  changePct: { kind: 'no-data' },
  dayHigh: { kind: 'no-data' },
  dayLow: { kind: 'no-data' },
  volume: { kind: 'no-data' },
};
void quoteWithoutPrice;
