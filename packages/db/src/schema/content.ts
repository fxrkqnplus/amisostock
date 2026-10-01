import { sql } from 'drizzle-orm/sql';
import {
  check,
  date,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { assets, sources } from './reference.js';

type RatioInputSource = Readonly<{
  sourceId: string;
  asOf: string;
}>;

type RatioCalcTrace = Readonly<{
  input: Readonly<{
    sources: readonly [RatioInputSource, ...RatioInputSource[]];
    values: Readonly<Record<string, unknown>>;
  }>;
  steps: readonly Readonly<{ name: string; value: string; reason: string }>[];
  output: Readonly<Record<string, string | null>>;
  summary: string;
}>;

export const disclosures = pgTable(
  'disclosures',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id),
    kapId: text('kap_id').notNull(),
    category: text('category').notNull(),
    title: text('title').notNull(),
    summary: text('summary'),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    url: text('url').notNull(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id),
  },
  (table) => [
    unique('disclosures_kap_asset_unique').on(table.kapId, table.assetId),
  ],
);

export const news = pgTable(
  'news',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').notNull(),
    excerpt: text('excerpt'),
    url: text('url').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id),
    // A fingerprint can recur after the 48-hour deduplication window.
    fingerprint: text('fingerprint').notNull(),
    groupId: uuid('group_id').notNull(),
    sentiment: numeric('sentiment', { precision: 5, scale: 4 }),
    sentimentMethod: text('sentiment_method'),
    status: text('status', { enum: ['published', 'corrected'] })
      .notNull()
      .default('published'),
  },
  (table) => [
    check('news_sentiment_check', sql`${table.sentiment} BETWEEN -1 AND 1`),
    check(
      'news_sentiment_method_check',
      sql`${table.sentiment} IS NULL OR ${table.sentimentMethod} IS NOT NULL`,
    ),
    check(
      'news_status_check',
      sql`${table.status} IN ('published', 'corrected')`,
    ),
  ],
);

export const newsAssets = pgTable(
  'news_assets',
  {
    newsId: uuid('news_id')
      .notNull()
      .references(() => news.id, { onDelete: 'cascade' }),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id),
    matchConfidence: numeric('match_confidence', {
      precision: 5,
      scale: 4,
    }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.newsId, table.assetId] }),
    check(
      'news_assets_confidence_check',
      sql`${table.matchConfidence} BETWEEN 0 AND 1`,
    ),
  ],
);

export const financials = pgTable(
  'financials',
  {
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id),
    // Reporting period end is a calendar date, not an instant.
    period: date('period', { mode: 'string' }).notNull(),
    currency: text('currency').notNull(),
    revenue: numeric('revenue', { precision: 20, scale: 6 }),
    netIncome: numeric('net_income', { precision: 20, scale: 6 }),
    equity: numeric('equity', { precision: 20, scale: 6 }),
    totalDebt: numeric('total_debt', { precision: 20, scale: 6 }),
    sharesOutstanding: numeric('shares_outstanding', {
      precision: 30,
      scale: 6,
    }),
    epsTtm: numeric('eps_ttm', { precision: 20, scale: 6 }),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id),
  },
  (table) => [
    primaryKey({ columns: [table.assetId, table.period] }),
    check('financials_shares_check', sql`${table.sharesOutstanding} >= 0`),
  ],
);

// Ratios are dimensionless derived values; missing inputs stay NULL rather than zero.
export const fundamentalRatios = pgTable(
  'fundamental_ratios',
  {
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id),
    asOf: timestamp('as_of', { withTimezone: true }).notNull(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id),
    freshness: text('freshness', { enum: ['estimate'] })
      .notNull()
      .default('estimate'),
    calcTrace: jsonb('calc_trace').$type<RatioCalcTrace>().notNull(),
    pe: numeric('pe', { precision: 20, scale: 6 }),
    pb: numeric('pb', { precision: 20, scale: 6 }),
    roe: numeric('roe', { precision: 20, scale: 6 }),
    debtToEquity: numeric('debt_to_equity', { precision: 20, scale: 6 }),
    dividendYield: numeric('dividend_yield', { precision: 20, scale: 6 }),
    earningsGrowthYoy: numeric('earnings_growth_yoy', {
      precision: 20,
      scale: 6,
    }),
  },
  (table) => [
    primaryKey({ columns: [table.assetId, table.asOf] }),
    check(
      'fundamental_ratios_freshness_check',
      sql`${table.freshness} = 'estimate'`,
    ),
    check(
      'fundamental_ratios_trace_sources_check',
      sql`CASE WHEN jsonb_typeof(${table.calcTrace} -> 'input' -> 'sources') = 'array'
        THEN jsonb_array_length(${table.calcTrace} -> 'input' -> 'sources') > 0
        ELSE FALSE END`,
    ),
  ],
);
