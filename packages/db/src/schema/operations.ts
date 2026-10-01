import { sql } from 'drizzle-orm/sql';
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { sources } from './reference.js';

export const ingestJobKind = pgEnum('ingest_job_kind', [
  'ingest',
  'rollup',
  'retention',
]);
export const ingestRunStatus = pgEnum('ingest_run_status', [
  'running',
  'succeeded',
  'failed',
]);
export const providerHealthState = pgEnum('provider_health_state', [
  'healthy',
  'degraded',
  'down',
]);

export const ingestRuns = pgTable(
  'ingest_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Rollup and retention jobs have no external provider.
    sourceId: uuid('source_id').references(() => sources.id),
    jobKind: ingestJobKind('job_kind').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    status: ingestRunStatus('status').default('running').notNull(),
    rows: bigint('rows', { mode: 'number' }).default(0).notNull(),
    error: text('error'),
    details: jsonb('details').$type<Record<string, unknown>>(),
  },
  (t) => [
    index('ingest_runs_source_started_idx').on(t.sourceId, t.startedAt),
    index('ingest_runs_kind_started_idx').on(t.jobKind, t.startedAt),
    check('ingest_runs_rows_nonnegative', sql`${t.rows} >= 0`),
  ],
);

export const providerHealth = pgTable(
  'provider_health',
  {
    sourceId: uuid('source_id')
      .primaryKey()
      .references(() => sources.id),
    lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
    consecutiveFailures: integer('consecutive_failures').default(0).notNull(),
    state: providerHealthState('state').default('healthy').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    check(
      'provider_health_failures_nonnegative',
      sql`${t.consecutiveFailures} >= 0`,
    ),
  ],
);
