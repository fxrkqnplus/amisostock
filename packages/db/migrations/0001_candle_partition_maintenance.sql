-- The root table is partitioned by UTC month; each month keeps the four
-- timeframes in separate leaves so retention can preserve all 1d history.
CREATE OR REPLACE FUNCTION public.ensure_candle_partitions(
  p_from date,
  p_through date
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_root text;
  v_month date;
  v_month_end date;
  v_month_table text;
  v_timeframe text;
BEGIN
  IF p_from IS NULL OR p_through IS NULL OR p_from > p_through THEN
    RAISE EXCEPTION 'Invalid candle partition range: % through %', p_from, p_through;
  END IF;

  FOREACH v_root IN ARRAY ARRAY['price_candles', 'adjusted_price_candles'] LOOP
    v_month := date_trunc('month', p_from::timestamp)::date;
    WHILE v_month <= p_through LOOP
      v_month_end := (v_month + interval '1 month')::date;
      v_month_table := v_root || '_' || to_char(v_month, 'YYYYMM');

      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.%I '
        'FOR VALUES FROM (%L) TO (%L) PARTITION BY LIST (timeframe)',
        v_month_table,
        v_root,
        to_char(v_month, 'YYYY-MM-DD') || ' 00:00:00+00',
        to_char(v_month_end, 'YYYY-MM-DD') || ' 00:00:00+00'
      );

      FOREACH v_timeframe IN ARRAY ARRAY['1m', '5m', '1h', '1d'] LOOP
        EXECUTE format(
          'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.%I '
          'FOR VALUES IN (%L)',
          v_month_table || '_' || v_timeframe,
          v_month_table,
          v_timeframe
        );
      END LOOP;

      v_month := v_month_end;
    END LOOP;
  END LOOP;
END;
$$;--> statement-breakpoint

-- Create the current and following UTC month. Ingest jobs must call this
-- function for their requested date range before inserting historical data.
DO $$
DECLARE
  v_current_month date := date_trunc(
    'month',
    (statement_timestamp() AT TIME ZONE 'UTC')
  )::date;
BEGIN
  PERFORM public.ensure_candle_partitions(
    v_current_month,
    (v_current_month + interval '1 month')::date
  );
END;
$$;--> statement-breakpoint

-- Rollup jobs attest per asset and per physical series using ingest_runs.details:
-- {"series":"price_candles", "assetId":"<uuid>",
--  "inputTimeframe":"1m", "outputTimeframe":"1d",
--  "verifiedThrough":"<ISO-8601 timestamp with offset>"}.
-- Verification includes the market-local session calendar and complete 1d bars.
CREATE OR REPLACE FUNCTION public.prune_candles(
  p_as_of timestamptz DEFAULT statement_timestamp()
)
RETURNS TABLE (
  series_name text,
  timeframe_name text,
  rows_removed bigint,
  partitions_removed integer
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_root text;
  v_timeframe text;
  v_cutoff timestamptz;
  v_asset uuid;
  v_partition record;
  v_leaf text;
  v_count bigint;
  v_dropped integer;
  v_total bigint := 0;
  v_audit_details jsonb := '{}'::jsonb;
BEGIN
  IF p_as_of IS NULL OR p_as_of > statement_timestamp() + interval '1 minute' THEN
    RAISE EXCEPTION 'Retention timestamp must not be in the future';
  END IF;

  -- Block concurrent writes through either partitioned root while the assets
  -- are checked, expired leaves are dropped, and boundary rows are deleted.
  LOCK TABLE public.price_candles, public.adjusted_price_candles
    IN SHARE ROW EXCLUSIVE MODE;

  FOREACH v_root IN ARRAY ARRAY['price_candles', 'adjusted_price_candles'] LOOP
    FOREACH v_timeframe IN ARRAY ARRAY['1m', '5m', '1h'] LOOP
      v_cutoff := CASE v_timeframe
        WHEN '1m' THEN p_as_of - interval '90 days'
        WHEN '5m' THEN p_as_of - interval '1 year'
        WHEN '1h' THEN p_as_of - interval '3 years'
      END;

      EXECUTE format(
        'SELECT count(*) FROM public.%I WHERE timeframe = $1 AND ts < $2',
        v_root
      ) INTO v_count USING v_timeframe, v_cutoff;

      IF v_count = 0 THEN
        series_name := v_root;
        timeframe_name := v_timeframe;
        rows_removed := 0;
        partitions_removed := 0;
        RETURN NEXT;
        CONTINUE;
      END IF;

      -- Every affected asset must have a completed daily rollup attestation.
      FOR v_asset IN EXECUTE format(
        'SELECT DISTINCT asset_id FROM public.%I '
        'WHERE timeframe = $1 AND ts < $2',
        v_root
      ) USING v_timeframe, v_cutoff LOOP
        IF NOT EXISTS (
          SELECT 1
          FROM public.ingest_runs AS r
          WHERE r.job_kind = 'rollup'
            AND r.status = 'succeeded'
            AND r.finished_at IS NOT NULL
            AND r.details ->> 'series' = v_root
            AND r.details ->> 'assetId' = v_asset::text
            AND r.details ->> 'inputTimeframe' = v_timeframe
            AND r.details ->> 'outputTimeframe' = '1d'
            AND (r.details ->> 'verifiedThrough')::timestamptz >= v_cutoff
        ) THEN
          RAISE EXCEPTION
            'Cannot prune %.% for asset % before verified 1d rollup through %',
            v_root, v_timeframe, v_asset, v_cutoff;
        END IF;
      END LOOP;

      v_dropped := 0;
      FOR v_partition IN
        SELECT
          child.relname AS month_table,
          to_date(right(child.relname, 6), 'YYYYMM') AS month_start
        FROM pg_inherits AS inheritance
        JOIN pg_class AS child ON child.oid = inheritance.inhrelid
        WHERE inheritance.inhparent = to_regclass(format('public.%I', v_root))
          AND child.relname ~ ('^' || v_root || '_[0-9]{6}$')
      LOOP
        IF (v_partition.month_start + interval '1 month') AT TIME ZONE 'UTC'
          <= v_cutoff THEN
          v_leaf := v_partition.month_table || '_' || v_timeframe;
          IF to_regclass(format('public.%I', v_leaf)) IS NOT NULL THEN
            EXECUTE format('DROP TABLE public.%I', v_leaf);
            v_dropped := v_dropped + 1;
          END IF;
        END IF;
      END LOOP;

      EXECUTE format(
        'DELETE FROM public.%I WHERE timeframe = $1 AND ts < $2',
        v_root
      ) USING v_timeframe, v_cutoff;

      v_total := v_total + v_count;
      v_audit_details := v_audit_details || jsonb_build_object(
        v_root || ':' || v_timeframe,
        jsonb_build_object(
          'cutoff', v_cutoff,
          'rows', v_count,
          'partitions', v_dropped
        )
      );

      series_name := v_root;
      timeframe_name := v_timeframe;
      rows_removed := v_count;
      partitions_removed := v_dropped;
      RETURN NEXT;
    END LOOP;
  END LOOP;

  INSERT INTO public.ingest_runs (
    job_kind,
    started_at,
    finished_at,
    status,
    rows,
    details
  ) VALUES (
    'retention',
    statement_timestamp(),
    clock_timestamp(),
    'succeeded',
    v_total,
    jsonb_build_object('asOf', p_as_of) || v_audit_details
  );
END;
$$;
