import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is required to run the database integration check.',
  );
}

const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
const client = await pool.connect();
client.on('error', (error) => {
  process.stderr.write(`[db:integration] client error: ${error.message}\n`);
});
if (process.env.DB_INTEGRATION_VERBOSE === '1') {
  const query = client.query.bind(client);
  client.query = (...args) => {
    const statement = typeof args[0] === 'string' ? args[0] : args[0].text;
    process.stdout.write(`[db:integration] ${statement.slice(0, 100)}\n`);
    return query(...args).catch((error) => {
      process.stderr.write(`[db:integration] SQL error: ${error.message}\n`);
      throw error;
    });
  };
}

try {
  await client.query('BEGIN');

  const roots = await client.query(
    `SELECT c.relname, pg_get_partkeydef(c.oid) AS partition_key
     FROM pg_class AS c
     JOIN pg_namespace AS n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname IN ('price_candles', 'adjusted_price_candles')
     ORDER BY c.relname`,
  );
  assert.deepEqual(
    roots.rows.map((row) => [row.relname, row.partition_key]),
    [
      ['adjusted_price_candles', 'RANGE (ts)'],
      ['price_candles', 'RANGE (ts)'],
    ],
  );

  const monthlyPartitions = await client.query(
    `SELECT count(*)::integer AS count
     FROM pg_inherits AS inheritance
     JOIN pg_class AS month_table ON month_table.oid = inheritance.inhrelid
     WHERE month_table.relname ~ '^(adjusted_price_candles|price_candles)_[0-9]{6}$'
       AND pg_get_partkeydef(month_table.oid) = 'LIST (timeframe)'`,
  );
  assert.ok(monthlyPartitions.rows[0].count >= 4);

  await client.query(
    "SELECT public.ensure_candle_partitions('2020-01-01', '2020-01-31')",
  );
  await client.query(
    "SELECT public.ensure_candle_partitions('2020-01-01', '2020-01-31')",
  );

  const sourceId = randomUUID();
  const estimateSourceId = randomUUID();
  const assetId = randomUUID();
  const userId = randomUUID();
  const alertId = randomUUID();
  await client.query(
    `INSERT INTO public.sources (id, kind, name)
     VALUES ($1, 'market', $2)`,
    [sourceId, `integration-${sourceId}`],
  );
  await client.query(
    `INSERT INTO public.sources (id, kind, name)
     VALUES ($1, 'market', $2)`,
    [estimateSourceId, `integration-${estimateSourceId}`],
  );
  await client.query(
    `INSERT INTO public.markets (id, timezone, currency)
     VALUES ('INTEGRATION', 'UTC', 'USD')`,
  );
  await client.query(
    `INSERT INTO public.assets (id, market_id, ticker, name, asset_class, currency)
     VALUES ($1, 'INTEGRATION', 'TEST', 'Integration test', 'equity', 'USD')`,
    [assetId],
  );
  await client.query(
    `INSERT INTO public.quotes
       (asset_id, currency, price, as_of, source_id, freshness)
     VALUES
       ($1, 'USD', 10, statement_timestamp(), $2, 'close'),
       ($1, 'USD', 10.1, statement_timestamp(), $3, 'estimate')`,
    [assetId, sourceId, estimateSourceId],
  );
  const sourceQuotes = await client.query(
    `SELECT count(*)::integer AS count
     FROM public.quotes
     WHERE asset_id = $1 AND source_id IN ($2, $3)`,
    [assetId, sourceId, estimateSourceId],
  );
  assert.equal(sourceQuotes.rows[0].count, 2);
  await client.query(
    `INSERT INTO public.users (id, email, password_hash)
     VALUES ($1, $2, 'integration-test-hash')`,
    [userId, `integration-${userId}@example.test`],
  );
  await client.query(
    `INSERT INTO public.alerts (id, user_id, asset_id, kind, "condition")
     VALUES ($1, $2, $3, 'price_threshold', '{"above":"10"}'::jsonb)`,
    [alertId, userId, assetId],
  );
  const alertDelayConstraint = await client.query(
    `SELECT convalidated
     FROM pg_constraint
     WHERE conname = 'alert_events_delay_freshness_check'`,
  );
  assert.equal(alertDelayConstraint.rows.length, 1);
  assert.equal(alertDelayConstraint.rows[0].convalidated, true);
  await client.query(
    `INSERT INTO public.alert_events
       (user_id, alert_id, source_id, observed_value, observed_currency,
        observed_at, freshness, delay_minutes)
     VALUES ($1, $2, $3, 10, 'USD', statement_timestamp(), 'delayed', 5)`,
    [userId, alertId, sourceId],
  );

  const oldTimestamp = '2020-01-15T12:00:00.000Z';
  for (const table of ['price_candles', 'adjusted_price_candles']) {
    for (const timeframe of ['1m', '1d']) {
      await client.query(
        `INSERT INTO public.${table}
           (asset_id, timeframe, ts, currency, open, high, low, close, volume, source_id)
         VALUES ($1, $2, $3, 'USD', 9, 10, 8, 9.5, 100, $4)`,
        [assetId, timeframe, oldTimestamp, sourceId],
      );
    }
  }

  const asOf = '2020-07-01T00:00:00.000Z';
  await client.query('SAVEPOINT missing_rollup_attestation');
  await assert.rejects(
    client.query("SELECT * FROM public.prune_candles('2020-07-01T00:00:00Z')"),
    /Cannot prune price_candles\.1m/,
  );
  await client.query('ROLLBACK TO SAVEPOINT missing_rollup_attestation');
  await client.query('RELEASE SAVEPOINT missing_rollup_attestation');

  for (const series of ['price_candles', 'adjusted_price_candles']) {
    await client.query(
      `INSERT INTO public.ingest_runs
         (job_kind, finished_at, status, rows, details)
       VALUES ('rollup', statement_timestamp(), 'succeeded', 2, $1)`,
      [
        {
          series,
          assetId,
          inputTimeframe: '1m',
          outputTimeframe: '1d',
          verifiedThrough: asOf,
        },
      ],
    );
  }

  const pruning = await client.query(
    "SELECT * FROM public.prune_candles('2020-07-01T00:00:00Z')",
  );
  for (const series of ['price_candles', 'adjusted_price_candles']) {
    const prunedMinutes = pruning.rows.find(
      (row) => row.series_name === series && row.timeframe_name === '1m',
    );
    assert.equal(Number(prunedMinutes.rows_removed), 1);
    assert.equal(prunedMinutes.partitions_removed, 1);

    const remaining = await client.query(
      `SELECT timeframe, count(*)::integer AS count
       FROM public.${series}
       WHERE asset_id = $1
       GROUP BY timeframe`,
      [assetId],
    );
    assert.deepEqual(
      remaining.rows.map((row) => [row.timeframe, row.count]),
      [['1d', 1]],
    );
  }

  const audit = await client.query(
    `SELECT rows, details
     FROM public.ingest_runs
     WHERE job_kind = 'retention'
       AND (details ->> 'asOf')::timestamptz = $1::timestamptz`,
    [asOf],
  );
  const auditEntry = audit.rows.find(
    (row) =>
      row.details['price_candles:1m']?.rows === 1 &&
      row.details['adjusted_price_candles:1m']?.rows === 1,
  );
  assert.ok(auditEntry);
  assert.equal(Number(auditEntry.rows), 2);
  assert.equal(auditEntry.details['price_candles:1m'].partitions, 1);
  assert.equal(auditEntry.details['adjusted_price_candles:1m'].partitions, 1);

  process.stdout.write(
    '[db:integration] source-separated quotes, partitioning, rollup guard, retention, and audit checks passed\n',
  );
} finally {
  try {
    await client.query('ROLLBACK');
  } finally {
    client.release();
    await pool.end();
  }
}
