export const PACKAGE_NAME = '@amisostock/shared' as const;

export {
  isoCurrencySchema,
  parseIsoCurrency,
  parseProviderId,
  parseSignalId,
  parseSourceId,
  parseTicker,
  providerIdSchema,
  signalIdSchema,
  sourceIdSchema,
  tickerSchema,
} from './identifiers.js';
export type {
  IsoCurrency,
  ProviderId,
  SignalId,
  SourceId,
  Ticker,
} from './identifiers.js';
export {
  addMoney,
  createMoney,
  moneyAmountSchema,
  moneySchema,
  parseMoney,
  subtractMoney,
} from './money.js';
export type { Money } from './money.js';
export {
  decimalValueSchema,
  displayDatumSchema,
  displayValueSchema,
  freshnessSchema,
  parseQuote,
  quoteSchema,
} from './market-data.js';
export type {
  DisplayDatum,
  DisplayValue,
  Freshness,
  Quote,
} from './market-data.js';
