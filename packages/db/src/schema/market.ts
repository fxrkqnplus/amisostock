import { sql } from 'drizzle-orm/sql';
import {
  check,
  date,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { assets, sources } from './reference.js';

const candleColumns = () => ({
  assetId: uuid('asset_id')
    .notNull()
    .references(() => assets.id),
  timeframe: text('timeframe', { enum: ['1m', '5m', '1h', '1d'] }).notNull(),
  ts: timestamp('ts', { withTimezone: true }).notNull(),
  currency: text('currency').notNull(),
  open: numeric('open', { precision: 20, scale: 6 }).notNull(),
  high: numeric('high', { precision: 20, scale: 6 }).notNull(),
  low: numeric('low', { precision: 20, scale: 6 }).notNull(),
  close: numeric('close', { precision: 20, scale: 6 }).notNull(),
  volume: numeric('volume', { precision: 30, scale: 6 }),
  sourceId: uuid('source_id')
    .notNull()
    .references(() => sources.id),
});

export const quotes = pgTable(
  'quotes',
  {
    assetId: uuid('asset_id')
      .primaryKey()
      .references(() => assets.id),
    currency: text('currency').notNull(),
    price: numeric('price', { precision: 20, scale: 6 }).notNull(),
    changeAbs: numeric('change_abs', { precision: 20, scale: 6 }),
    changePct: numeric('change_pct', { precision: 12, scale: 6 }),
    dayHigh: numeric('day_high', { precision: 20, scale: 6 }),
    dayLow: numeric('day_low', { precision: 20, scale: 6 }),
    volume: numeric('volume', { precision: 30, scale: 6 }),
    asOf: timestamp('as_of', { withTimezone: true }).notNull(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id),
    freshness: text('freshness', {
      enum: ['live', 'delayed', 'close', 'estimate'],
    }).notNull(),
    delayMinutes: integer('delay_minutes'),
  },
  (table) => [
    check('quotes_price_check', sql`${table.price} > 0`),
    check('quotes_day_range_check', sql`${table.dayHigh} >= ${table.dayLow}`),
    check('quotes_volume_check', sql`${table.volume} >= 0`),
    check(
      'quotes_freshness_check',
      sql`${table.freshness} IN ('live', 'delayed', 'close', 'estimate')`,
    ),
    check(
      'quotes_delay_minutes_check',
      sql`(${table.freshness} = 'delayed' AND ${table.delayMinutes} IS NOT NULL
        AND ${table.delayMinutes} > 0)
        OR (${table.freshness} <> 'delayed' AND ${table.delayMinutes} IS NULL)`,
    ),
  ],
);

// Migration defines RANGE(ts) monthly partitions with LIST(timeframe)
// subpartitions. The Drizzle declaration describes the common row contract.
export const priceCandles = pgTable(
  'price_candles',
  candleColumns(),
  (table) => [
    primaryKey({ columns: [table.assetId, table.timeframe, table.ts] }),
    check(
      'price_candles_timeframe_check',
      sql`${table.timeframe} IN ('1m', '5m', '1h', '1d')`,
    ),
    check(
      'price_candles_prices_check',
      sql`
    ${table.low} > 0 AND ${table.low} <= ${table.high}
    AND ${table.open} BETWEEN ${table.low} AND ${table.high}
    AND ${table.close} BETWEEN ${table.low} AND ${table.high}
  `,
    ),
    check('price_candles_volume_check', sql`${table.volume} >= 0`),
  ],
);

// L-02 requires a physically distinct adjusted series. Rows are written only
// after all required corporate actions have been verified; raw rows remain intact.
export const adjustedPriceCandles = pgTable(
  'adjusted_price_candles',
  candleColumns(),
  (table) => [
    primaryKey({ columns: [table.assetId, table.timeframe, table.ts] }),
    check(
      'adjusted_price_candles_timeframe_check',
      sql`${table.timeframe} IN ('1m', '5m', '1h', '1d')`,
    ),
    check(
      'adjusted_price_candles_prices_check',
      sql`
    ${table.low} > 0 AND ${table.low} <= ${table.high}
    AND ${table.open} BETWEEN ${table.low} AND ${table.high}
    AND ${table.close} BETWEEN ${table.low} AND ${table.high}
  `,
    ),
    check('adjusted_price_candles_volume_check', sql`${table.volume} >= 0`),
  ],
);

export const corporateActions = pgTable(
  'corporate_actions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id),
    exDate: date('ex_date', { mode: 'string' }).notNull(),
    kind: text('kind', {
      enum: ['bonus', 'rights', 'split', 'dividend'],
    }).notNull(),
    ratio: numeric('ratio', { precision: 30, scale: 16 }),
    amount: numeric('amount', { precision: 20, scale: 6 }),
    subscriptionPrice: numeric('subscription_price', {
      precision: 20,
      scale: 6,
    }),
    currency: text('currency').notNull(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id),
  },
  (table) => [
    check(
      'corporate_actions_kind_check',
      sql`${table.kind} IN ('bonus', 'rights', 'split', 'dividend')`,
    ),
    check('corporate_actions_ratio_check', sql`${table.ratio} > 0`),
    check('corporate_actions_amount_check', sql`${table.amount} >= 0`),
    check(
      'corporate_actions_subscription_price_check',
      sql`${table.subscriptionPrice} >= 0`,
    ),
  ],
);

// The ingestion process derives one cumulative factor per asset and ex-date.
export const adjustmentFactors = pgTable(
  'adjustment_factors',
  {
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id),
    exDate: date('ex_date', { mode: 'string' }).notNull(),
    priceFactor: numeric('price_factor', {
      precision: 30,
      scale: 16,
    }).notNull(),
    volumeFactor: numeric('volume_factor', {
      precision: 30,
      scale: 16,
    }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.assetId, table.exDate] }),
    check('adjustment_factors_price_check', sql`${table.priceFactor} > 0`),
    check('adjustment_factors_volume_check', sql`${table.volumeFactor} > 0`),
  ],
);
