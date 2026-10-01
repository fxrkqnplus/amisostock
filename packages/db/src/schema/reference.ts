import { sql } from 'drizzle-orm/sql';
import {
  boolean,
  check,
  date,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  time,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const sources = pgTable(
  'sources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    kind: text('kind', {
      enum: ['market', 'news', 'macro', 'disclosure'],
    }).notNull(),
    name: text('name').notNull(),
    priority: integer('priority').notNull().default(0),
    licenseNote: text('license_note'),
    attributionText: text('attribution_text'),
  },
  (table) => [
    check(
      'sources_kind_check',
      sql`${table.kind} IN ('market', 'news', 'macro', 'disclosure')`,
    ),
    check('sources_priority_check', sql`${table.priority} >= 0`),
    unique('sources_kind_name_unique').on(table.kind, table.name),
  ],
);

export const markets = pgTable(
  'markets',
  {
    id: text('id').primaryKey(),
    timezone: text('timezone').notNull(),
    currency: text('currency').notNull(),
    // A 24-hour market has no session boundary; these are local market times.
    sessionOpen: time('session_open'),
    sessionClose: time('session_close'),
    hasDelay: boolean('has_delay').notNull().default(false),
    delayMinutes: integer('delay_minutes').notNull().default(0),
  },
  (table) => [
    check(
      'markets_delay_minutes_check',
      sql`(${table.hasDelay} AND ${table.delayMinutes} > 0)
        OR (NOT ${table.hasDelay} AND ${table.delayMinutes} = 0)`,
    ),
    check(
      'markets_session_pair_check',
      sql`(${table.sessionOpen} IS NULL) = (${table.sessionClose} IS NULL)`,
    ),
  ],
);

export const assets = pgTable(
  'assets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    marketId: text('market_id')
      .notNull()
      .references(() => markets.id),
    ticker: text('ticker').notNull(),
    name: text('name').notNull(),
    assetClass: text('asset_class', {
      enum: ['equity', 'crypto', 'fx', 'index', 'fund', 'commodity'],
    }).notNull(),
    sector: text('sector'),
    currency: text('currency').notNull(),
    status: text('status', {
      enum: ['active', 'suspended', 'restricted', 'delisted'],
    })
      .notNull()
      .default('active'),
    listedAt: date('listed_at', { mode: 'string' }),
    freeFloatPct: numeric('free_float_pct', { precision: 8, scale: 4 }),
  },
  (table) => [
    unique('assets_market_ticker_unique').on(table.marketId, table.ticker),
    check(
      'assets_asset_class_check',
      sql`${table.assetClass} IN ('equity', 'crypto', 'fx', 'index', 'fund', 'commodity')`,
    ),
    check(
      'assets_status_check',
      sql`${table.status} IN ('active', 'suspended', 'restricted', 'delisted')`,
    ),
    check(
      'assets_free_float_pct_check',
      sql`${table.freeFloatPct} BETWEEN 0 AND 100`,
    ),
  ],
);

// Provider-specific market symbols belong to the asset reference data so the
// ingestion layer never has to infer exchange pairs or aggregator IDs.
export const assetProviderSymbols = pgTable(
  'asset_provider_symbols',
  {
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),
    providerId: text('provider_id').notNull(),
    providerSymbol: text('provider_symbol').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.assetId, table.providerId] }),
    unique('asset_provider_symbols_provider_symbol_unique').on(
      table.providerId,
      table.providerSymbol,
    ),
    check(
      'asset_provider_symbols_provider_id_check',
      sql`${table.providerId} ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'`,
    ),
    check(
      'asset_provider_symbols_symbol_check',
      sql`length(btrim(${table.providerSymbol})) > 0`,
    ),
  ],
);

export const assetAliases = pgTable(
  'asset_aliases',
  {
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),
    alias: text('alias').notNull(),
    aliasKind: text('alias_kind', {
      enum: ['ticker', 'former_name', 'common_name', 'isin'],
    }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.assetId, table.alias, table.aliasKind] }),
    check(
      'asset_aliases_kind_check',
      sql`${table.aliasKind} IN ('ticker', 'former_name', 'common_name', 'isin')`,
    ),
  ],
);

export const marketCalendar = pgTable(
  'market_calendar',
  {
    marketId: text('market_id')
      .notNull()
      .references(() => markets.id),
    date: date('date', { mode: 'string' }).notNull(),
    kind: text('kind', { enum: ['full', 'half', 'holiday'] }).notNull(),
    note: text('note'),
  },
  (table) => [
    primaryKey({ columns: [table.marketId, table.date] }),
    check(
      'market_calendar_kind_check',
      sql`${table.kind} IN ('full', 'half', 'holiday')`,
    ),
  ],
);
