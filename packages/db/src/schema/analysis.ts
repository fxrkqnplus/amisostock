import { sql } from 'drizzle-orm/sql';
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { assets } from './reference.js';

export const signalVerdict = pgEnum('signal_verdict', ['buy', 'sell', 'hold']);
export const targetMethodEnum = pgEnum('price_target_method', [
  'sector_multiple',
  'historical_multiple_band',
  'technical_projection',
]);

export const signals = pgTable(
  'signals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id),
    verdict: signalVerdict('verdict').notNull(),
    score: numeric('score', { precision: 20, scale: 6 }).notNull(),
    confidence: numeric('confidence', { precision: 20, scale: 6 }).notNull(),
    components: jsonb('components').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    validUntil: timestamp('valid_until', { withTimezone: true }).notNull(),
    inputsHash: text('inputs_hash').notNull(),
  },
  (t) => [
    uniqueIndex('signals_asset_inputs_hash_uniq').on(t.assetId, t.inputsHash),
    index('signals_asset_created_idx').on(t.assetId, t.createdAt),
    check('signals_score_range', sql`${t.score} BETWEEN -100 AND 100`),
    check('signals_confidence_range', sql`${t.confidence} BETWEEN 0 AND 1`),
    check(
      'signals_valid_after_creation',
      sql`${t.validUntil} > ${t.createdAt}`,
    ),
  ],
);

export const priceTargets = pgTable(
  'price_targets',
  {
    signalId: uuid('signal_id')
      .notNull()
      .references(() => signals.id, { onDelete: 'cascade' }),
    method: targetMethodEnum('method').notNull(),
    targetValue: numeric('value', { precision: 20, scale: 6 }).notNull(),
    currency: text('currency').notNull(),
    inputs: jsonb('inputs').$type<Record<string, unknown>>().notNull(),
    validUntil: timestamp('valid_until', { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.signalId, t.method] }),
    check('price_targets_value_nonnegative', sql`${t.targetValue} >= 0`),
  ],
);

export const signalOutcomes = pgTable('signal_outcomes', {
  signalId: uuid('signal_id')
    .primaryKey()
    .references(() => signals.id, { onDelete: 'cascade' }),
  evaluatedAt: timestamp('evaluated_at', { withTimezone: true }).notNull(),
  assetReturnPct: numeric('asset_return_pct', {
    precision: 20,
    scale: 6,
  }).notNull(),
  // FX has no benchmark in SPEC §5.8; these fields are nullable for that market.
  benchmarkReturnPct: numeric('benchmark_return_pct', {
    precision: 20,
    scale: 6,
  }),
  excessPct: numeric('excess_pct', { precision: 20, scale: 6 }),
  hit: boolean('hit').notNull(),
});

export const aiAnalyses = pgTable(
  'ai_analyses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id),
    version: integer('version').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    sources: jsonb('sources').$type<unknown[]>().notNull(),
    model: text('model').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    supersededBy: uuid('superseded_by'),
  },
  (t) => [
    unique('ai_analyses_id_asset_uniq').on(t.id, t.assetId),
    uniqueIndex('ai_analyses_asset_version_uniq').on(t.assetId, t.version),
    index('ai_analyses_asset_created_idx').on(t.assetId, t.createdAt),
    foreignKey({
      name: 'ai_analyses_successor_same_asset_fk',
      columns: [t.supersededBy, t.assetId],
      foreignColumns: [t.id, t.assetId],
    }),
    check('ai_analyses_version_positive', sql`${t.version} > 0`),
  ],
);

export const aiUsage = pgTable(
  'ai_usage',
  {
    day: date('day').primaryKey(),
    requests: integer('requests').default(0).notNull(),
    inputTokens: integer('input_tokens').default(0).notNull(),
    outputTokens: integer('output_tokens').default(0).notNull(),
    estCostUsd: numeric('est_cost_usd', { precision: 20, scale: 6 })
      .default('0')
      .notNull(),
  },
  (t) => [
    check('ai_usage_requests_nonnegative', sql`${t.requests} >= 0`),
    check('ai_usage_input_tokens_nonnegative', sql`${t.inputTokens} >= 0`),
    check('ai_usage_output_tokens_nonnegative', sql`${t.outputTokens} >= 0`),
    check('ai_usage_cost_nonnegative', sql`${t.estCostUsd} >= 0`),
  ],
);
