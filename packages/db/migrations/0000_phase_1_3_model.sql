CREATE TYPE "public"."alert_kind" AS ENUM('price_threshold', 'percent_change', 'volume_spike', 'disclosure', 'signal_change', 'indicator_cross');--> statement-breakpoint
CREATE TYPE "public"."cost_basis_method" AS ENUM('weighted_average', 'fifo');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'email');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'delivered', 'failed');--> statement-breakpoint
CREATE TYPE "public"."observed_freshness" AS ENUM('live', 'delayed', 'close', 'estimate');--> statement-breakpoint
CREATE TYPE "public"."portfolio_kind" AS ENUM('real', 'paper');--> statement-breakpoint
CREATE TYPE "public"."transaction_origin" AS ENUM('manual', 'csv');--> statement-breakpoint
CREATE TYPE "public"."transaction_side" AS ENUM('buy', 'sell');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('member', 'admin');--> statement-breakpoint
CREATE TYPE "public"."signal_verdict" AS ENUM('buy', 'sell', 'hold');--> statement-breakpoint
CREATE TYPE "public"."price_target_method" AS ENUM('sector_multiple', 'historical_multiple_band', 'technical_projection');--> statement-breakpoint
CREATE TYPE "public"."ingest_job_kind" AS ENUM('ingest', 'rollup', 'retention');--> statement-breakpoint
CREATE TYPE "public"."ingest_run_status" AS ENUM('running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."provider_health_state" AS ENUM('healthy', 'degraded', 'down');--> statement-breakpoint
CREATE TABLE "asset_aliases" (
	"asset_id" uuid NOT NULL,
	"alias" text NOT NULL,
	"alias_kind" text NOT NULL,
	CONSTRAINT "asset_aliases_asset_id_alias_alias_kind_pk" PRIMARY KEY("asset_id","alias","alias_kind"),
	CONSTRAINT "asset_aliases_kind_check" CHECK ("asset_aliases"."alias_kind" IN ('ticker', 'former_name', 'common_name', 'isin'))
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" text NOT NULL,
	"ticker" text NOT NULL,
	"name" text NOT NULL,
	"asset_class" text NOT NULL,
	"sector" text,
	"currency" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"listed_at" date,
	"free_float_pct" numeric(8, 4),
	CONSTRAINT "assets_market_ticker_unique" UNIQUE("market_id","ticker"),
	CONSTRAINT "assets_asset_class_check" CHECK ("assets"."asset_class" IN ('equity', 'crypto', 'fx', 'index', 'fund', 'commodity')),
	CONSTRAINT "assets_status_check" CHECK ("assets"."status" IN ('active', 'suspended', 'restricted', 'delisted')),
	CONSTRAINT "assets_free_float_pct_check" CHECK ("assets"."free_float_pct" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "market_calendar" (
	"market_id" text NOT NULL,
	"date" date NOT NULL,
	"kind" text NOT NULL,
	"note" text,
	CONSTRAINT "market_calendar_market_id_date_pk" PRIMARY KEY("market_id","date"),
	CONSTRAINT "market_calendar_kind_check" CHECK ("market_calendar"."kind" IN ('full', 'half', 'holiday'))
);
--> statement-breakpoint
CREATE TABLE "markets" (
	"id" text PRIMARY KEY NOT NULL,
	"timezone" text NOT NULL,
	"currency" text NOT NULL,
	"session_open" time,
	"session_close" time,
	"has_delay" boolean DEFAULT false NOT NULL,
	"delay_minutes" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "markets_delay_minutes_check" CHECK (("markets"."has_delay" AND "markets"."delay_minutes" > 0)
        OR (NOT "markets"."has_delay" AND "markets"."delay_minutes" = 0)),
	CONSTRAINT "markets_session_pair_check" CHECK (("markets"."session_open" IS NULL) = ("markets"."session_close" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"license_note" text,
	"attribution_text" text,
	CONSTRAINT "sources_kind_name_unique" UNIQUE("kind","name"),
	CONSTRAINT "sources_kind_check" CHECK ("sources"."kind" IN ('market', 'news', 'macro', 'disclosure')),
	CONSTRAINT "sources_priority_check" CHECK ("sources"."priority" >= 0)
);
--> statement-breakpoint
CREATE TABLE "adjusted_price_candles" (
	"asset_id" uuid NOT NULL,
	"timeframe" text NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"currency" text NOT NULL,
	"open" numeric(20, 6) NOT NULL,
	"high" numeric(20, 6) NOT NULL,
	"low" numeric(20, 6) NOT NULL,
	"close" numeric(20, 6) NOT NULL,
	"volume" numeric(30, 6),
	"source_id" uuid NOT NULL,
	CONSTRAINT "adjusted_price_candles_asset_id_timeframe_ts_pk" PRIMARY KEY("asset_id","timeframe","ts"),
	CONSTRAINT "adjusted_price_candles_timeframe_check" CHECK ("adjusted_price_candles"."timeframe" IN ('1m', '5m', '1h', '1d')),
	CONSTRAINT "adjusted_price_candles_prices_check" CHECK (
    "adjusted_price_candles"."low" > 0 AND "adjusted_price_candles"."low" <= "adjusted_price_candles"."high"
    AND "adjusted_price_candles"."open" BETWEEN "adjusted_price_candles"."low" AND "adjusted_price_candles"."high"
    AND "adjusted_price_candles"."close" BETWEEN "adjusted_price_candles"."low" AND "adjusted_price_candles"."high"
  ),
	CONSTRAINT "adjusted_price_candles_volume_check" CHECK ("adjusted_price_candles"."volume" >= 0)
) PARTITION BY RANGE ("ts");
--> statement-breakpoint
CREATE TABLE "adjustment_factors" (
	"asset_id" uuid NOT NULL,
	"ex_date" date NOT NULL,
	"price_factor" numeric(30, 16) NOT NULL,
	"volume_factor" numeric(30, 16) NOT NULL,
	CONSTRAINT "adjustment_factors_asset_id_ex_date_pk" PRIMARY KEY("asset_id","ex_date"),
	CONSTRAINT "adjustment_factors_price_check" CHECK ("adjustment_factors"."price_factor" > 0),
	CONSTRAINT "adjustment_factors_volume_check" CHECK ("adjustment_factors"."volume_factor" > 0)
);
--> statement-breakpoint
CREATE TABLE "corporate_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"ex_date" date NOT NULL,
	"kind" text NOT NULL,
	"ratio" numeric(30, 16),
	"amount" numeric(20, 6),
	"subscription_price" numeric(20, 6),
	"currency" text NOT NULL,
	"source_id" uuid NOT NULL,
	CONSTRAINT "corporate_actions_kind_check" CHECK ("corporate_actions"."kind" IN ('bonus', 'rights', 'split', 'dividend')),
	CONSTRAINT "corporate_actions_ratio_check" CHECK ("corporate_actions"."ratio" > 0),
	CONSTRAINT "corporate_actions_amount_check" CHECK ("corporate_actions"."amount" >= 0),
	CONSTRAINT "corporate_actions_subscription_price_check" CHECK ("corporate_actions"."subscription_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "price_candles" (
	"asset_id" uuid NOT NULL,
	"timeframe" text NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"currency" text NOT NULL,
	"open" numeric(20, 6) NOT NULL,
	"high" numeric(20, 6) NOT NULL,
	"low" numeric(20, 6) NOT NULL,
	"close" numeric(20, 6) NOT NULL,
	"volume" numeric(30, 6),
	"source_id" uuid NOT NULL,
	CONSTRAINT "price_candles_asset_id_timeframe_ts_pk" PRIMARY KEY("asset_id","timeframe","ts"),
	CONSTRAINT "price_candles_timeframe_check" CHECK ("price_candles"."timeframe" IN ('1m', '5m', '1h', '1d')),
	CONSTRAINT "price_candles_prices_check" CHECK (
    "price_candles"."low" > 0 AND "price_candles"."low" <= "price_candles"."high"
    AND "price_candles"."open" BETWEEN "price_candles"."low" AND "price_candles"."high"
    AND "price_candles"."close" BETWEEN "price_candles"."low" AND "price_candles"."high"
  ),
	CONSTRAINT "price_candles_volume_check" CHECK ("price_candles"."volume" >= 0)
) PARTITION BY RANGE ("ts");
--> statement-breakpoint
CREATE TABLE "quotes" (
	"asset_id" uuid PRIMARY KEY NOT NULL,
	"currency" text NOT NULL,
	"price" numeric(20, 6) NOT NULL,
	"change_abs" numeric(20, 6),
	"change_pct" numeric(12, 6),
	"day_high" numeric(20, 6),
	"day_low" numeric(20, 6),
	"volume" numeric(30, 6),
	"as_of" timestamp with time zone NOT NULL,
	"source_id" uuid NOT NULL,
	"freshness" text NOT NULL,
	"delay_minutes" integer,
	CONSTRAINT "quotes_price_check" CHECK ("quotes"."price" > 0),
	CONSTRAINT "quotes_day_range_check" CHECK ("quotes"."day_high" >= "quotes"."day_low"),
	CONSTRAINT "quotes_volume_check" CHECK ("quotes"."volume" >= 0),
	CONSTRAINT "quotes_freshness_check" CHECK ("quotes"."freshness" IN ('live', 'delayed', 'close', 'estimate')),
	CONSTRAINT "quotes_delay_minutes_check" CHECK (("quotes"."freshness" = 'delayed' AND "quotes"."delay_minutes" IS NOT NULL
        AND "quotes"."delay_minutes" > 0)
        OR ("quotes"."freshness" <> 'delayed' AND "quotes"."delay_minutes" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "disclosures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"kap_id" text NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"published_at" timestamp with time zone NOT NULL,
	"url" text NOT NULL,
	"source_id" uuid NOT NULL,
	CONSTRAINT "disclosures_kap_asset_unique" UNIQUE("kap_id","asset_id")
);
--> statement-breakpoint
CREATE TABLE "financials" (
	"asset_id" uuid NOT NULL,
	"period" date NOT NULL,
	"currency" text NOT NULL,
	"revenue" numeric(20, 6),
	"net_income" numeric(20, 6),
	"equity" numeric(20, 6),
	"total_debt" numeric(20, 6),
	"shares_outstanding" numeric(30, 6),
	"eps_ttm" numeric(20, 6),
	"source_id" uuid NOT NULL,
	CONSTRAINT "financials_asset_id_period_pk" PRIMARY KEY("asset_id","period"),
	CONSTRAINT "financials_shares_check" CHECK ("financials"."shares_outstanding" >= 0)
);
--> statement-breakpoint
CREATE TABLE "fundamental_ratios" (
	"asset_id" uuid NOT NULL,
	"as_of" timestamp with time zone NOT NULL,
	"source_id" uuid NOT NULL,
	"freshness" text DEFAULT 'estimate' NOT NULL,
	"calc_trace" jsonb NOT NULL,
	"pe" numeric(20, 6),
	"pb" numeric(20, 6),
	"roe" numeric(20, 6),
	"debt_to_equity" numeric(20, 6),
	"dividend_yield" numeric(20, 6),
	"earnings_growth_yoy" numeric(20, 6),
	CONSTRAINT "fundamental_ratios_asset_id_as_of_pk" PRIMARY KEY("asset_id","as_of"),
	CONSTRAINT "fundamental_ratios_freshness_check" CHECK ("fundamental_ratios"."freshness" = 'estimate'),
	CONSTRAINT "fundamental_ratios_trace_sources_check" CHECK (CASE WHEN jsonb_typeof("fundamental_ratios"."calc_trace" -> 'input' -> 'sources') = 'array'
        THEN jsonb_array_length("fundamental_ratios"."calc_trace" -> 'input' -> 'sources') > 0
        ELSE FALSE END)
);
--> statement-breakpoint
CREATE TABLE "news" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"excerpt" text,
	"url" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"source_id" uuid NOT NULL,
	"fingerprint" text NOT NULL,
	"group_id" uuid NOT NULL,
	"sentiment" numeric(5, 4),
	"sentiment_method" text,
	"status" text DEFAULT 'published' NOT NULL,
	CONSTRAINT "news_sentiment_check" CHECK ("news"."sentiment" BETWEEN -1 AND 1),
	CONSTRAINT "news_sentiment_method_check" CHECK ("news"."sentiment" IS NULL OR "news"."sentiment_method" IS NOT NULL),
	CONSTRAINT "news_status_check" CHECK ("news"."status" IN ('published', 'corrected'))
);
--> statement-breakpoint
CREATE TABLE "news_assets" (
	"news_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"match_confidence" numeric(5, 4) NOT NULL,
	CONSTRAINT "news_assets_news_id_asset_id_pk" PRIMARY KEY("news_id","asset_id"),
	CONSTRAINT "news_assets_confidence_check" CHECK ("news_assets"."match_confidence" BETWEEN 0 AND 1)
);
--> statement-breakpoint
CREATE TABLE "alert_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"alert_id" uuid NOT NULL,
	"source_id" uuid,
	"observed_value" numeric(20, 6),
	"observed_currency" text,
	"observed_at" timestamp with time zone NOT NULL,
	"freshness" "observed_freshness" NOT NULL,
	"delay_minutes" integer DEFAULT 0 NOT NULL,
	"triggered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alert_events_id_user_uniq" UNIQUE("id","user_id"),
	CONSTRAINT "alert_events_delay_nonnegative" CHECK ("alert_events"."delay_minutes" >= 0),
	CONSTRAINT "alert_events_value_provenance_check" CHECK ("alert_events"."observed_value" IS NULL OR ("alert_events"."observed_currency" IS NOT NULL AND btrim("alert_events"."observed_currency") <> '' AND "alert_events"."source_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"kind" "alert_kind" NOT NULL,
	"condition" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"cooldown_minutes" integer DEFAULT 60 NOT NULL,
	"last_triggered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alerts_id_user_uniq" UNIQUE("id","user_id"),
	CONSTRAINT "alerts_cooldown_nonnegative" CHECK ("alerts"."cooldown_minutes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "allowlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"invited_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"used_at" timestamp with time zone,
	CONSTRAINT "allowlist_email_trim_check" CHECK ("allowlist"."email" = btrim("allowlist"."email") AND "allowlist"."email" <> '')
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"subject_type" text,
	"subject_id" uuid,
	"details" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"alert_event_id" uuid,
	"channel" "notification_channel" NOT NULL,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "portfolios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "portfolio_kind" NOT NULL,
	"cost_basis_method" "cost_basis_method" DEFAULT 'weighted_average' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portfolios_id_user_uniq" UNIQUE("id","user_id")
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"quantity" numeric(20, 6) NOT NULL,
	"average_cost" numeric(20, 6) NOT NULL,
	"cost_currency" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "positions_quantity_nonnegative" CHECK ("positions"."quantity" >= 0),
	CONSTRAINT "positions_average_cost_nonnegative" CHECK ("positions"."average_cost" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"side" "transaction_side" NOT NULL,
	"origin" "transaction_origin" DEFAULT 'manual' NOT NULL,
	"quantity" numeric(20, 6) NOT NULL,
	"unit_price" numeric(20, 6) NOT NULL,
	"fee" numeric(20, 6) DEFAULT '0' NOT NULL,
	"currency" text NOT NULL,
	"base_currency_at_trade" text NOT NULL,
	"fx_rate_to_base_at_trade" numeric(20, 6) NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_quantity_positive" CHECK ("transactions"."quantity" > 0),
	CONSTRAINT "transactions_unit_price_nonnegative" CHECK ("transactions"."unit_price" >= 0),
	CONSTRAINT "transactions_fee_nonnegative" CHECK ("transactions"."fee" >= 0),
	CONSTRAINT "transactions_fx_rate_positive" CHECK ("transactions"."fx_rate_to_base_at_trade" > 0)
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"base_currency" text DEFAULT 'TRY' NOT NULL,
	"theme" text DEFAULT 'dark' NOT NULL,
	"dashboard_layout" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"totp_secret_encrypted" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_trim_check" CHECK ("users"."email" = btrim("users"."email") AND "users"."email" <> '')
);
--> statement-breakpoint
CREATE TABLE "watchlist_items" (
	"user_id" uuid NOT NULL,
	"watchlist_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "watchlist_items_watchlist_id_asset_id_pk" PRIMARY KEY("watchlist_id","asset_id")
);
--> statement-breakpoint
CREATE TABLE "watchlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "watchlists_id_user_uniq" UNIQUE("id","user_id")
);
--> statement-breakpoint
CREATE TABLE "ai_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"sources" jsonb NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"superseded_by" uuid,
	CONSTRAINT "ai_analyses_id_asset_uniq" UNIQUE("id","asset_id"),
	CONSTRAINT "ai_analyses_version_positive" CHECK ("ai_analyses"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "ai_usage" (
	"day" date PRIMARY KEY NOT NULL,
	"requests" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"est_cost_usd" numeric(20, 6) DEFAULT '0' NOT NULL,
	CONSTRAINT "ai_usage_requests_nonnegative" CHECK ("ai_usage"."requests" >= 0),
	CONSTRAINT "ai_usage_input_tokens_nonnegative" CHECK ("ai_usage"."input_tokens" >= 0),
	CONSTRAINT "ai_usage_output_tokens_nonnegative" CHECK ("ai_usage"."output_tokens" >= 0),
	CONSTRAINT "ai_usage_cost_nonnegative" CHECK ("ai_usage"."est_cost_usd" >= 0)
);
--> statement-breakpoint
CREATE TABLE "price_targets" (
	"signal_id" uuid NOT NULL,
	"method" "price_target_method" NOT NULL,
	"value" numeric(20, 6) NOT NULL,
	"currency" text NOT NULL,
	"inputs" jsonb NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	CONSTRAINT "price_targets_signal_id_method_pk" PRIMARY KEY("signal_id","method"),
	CONSTRAINT "price_targets_value_nonnegative" CHECK ("price_targets"."value" >= 0)
);
--> statement-breakpoint
CREATE TABLE "signal_outcomes" (
	"signal_id" uuid PRIMARY KEY NOT NULL,
	"evaluated_at" timestamp with time zone NOT NULL,
	"asset_return_pct" numeric(20, 6) NOT NULL,
	"benchmark_return_pct" numeric(20, 6),
	"excess_pct" numeric(20, 6),
	"hit" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"verdict" "signal_verdict" NOT NULL,
	"score" numeric(20, 6) NOT NULL,
	"confidence" numeric(20, 6) NOT NULL,
	"components" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"inputs_hash" text NOT NULL,
	CONSTRAINT "signals_score_range" CHECK ("signals"."score" BETWEEN -100 AND 100),
	CONSTRAINT "signals_confidence_range" CHECK ("signals"."confidence" BETWEEN 0 AND 1),
	CONSTRAINT "signals_valid_after_creation" CHECK ("signals"."valid_until" > "signals"."created_at")
);
--> statement-breakpoint
CREATE TABLE "ingest_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid,
	"job_kind" "ingest_job_kind" NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" "ingest_run_status" DEFAULT 'running' NOT NULL,
	"rows" bigint DEFAULT 0 NOT NULL,
	"error" text,
	"details" jsonb,
	CONSTRAINT "ingest_runs_rows_nonnegative" CHECK ("ingest_runs"."rows" >= 0)
);
--> statement-breakpoint
CREATE TABLE "provider_health" (
	"source_id" uuid PRIMARY KEY NOT NULL,
	"last_success_at" timestamp with time zone,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"state" "provider_health_state" DEFAULT 'healthy' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_health_failures_nonnegative" CHECK ("provider_health"."consecutive_failures" >= 0)
);
--> statement-breakpoint
ALTER TABLE "asset_aliases" ADD CONSTRAINT "asset_aliases_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_calendar" ADD CONSTRAINT "market_calendar_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjusted_price_candles" ADD CONSTRAINT "adjusted_price_candles_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjusted_price_candles" ADD CONSTRAINT "adjusted_price_candles_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjustment_factors" ADD CONSTRAINT "adjustment_factors_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_actions" ADD CONSTRAINT "corporate_actions_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_actions" ADD CONSTRAINT "corporate_actions_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_candles" ADD CONSTRAINT "price_candles_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_candles" ADD CONSTRAINT "price_candles_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disclosures" ADD CONSTRAINT "disclosures_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disclosures" ADD CONSTRAINT "disclosures_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financials" ADD CONSTRAINT "financials_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financials" ADD CONSTRAINT "financials_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundamental_ratios" ADD CONSTRAINT "fundamental_ratios_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundamental_ratios" ADD CONSTRAINT "fundamental_ratios_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_assets" ADD CONSTRAINT "news_assets_news_id_news_id_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_assets" ADD CONSTRAINT "news_assets_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_alert_owner_fk" FOREIGN KEY ("alert_id","user_id") REFERENCES "public"."alerts"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allowlist" ADD CONSTRAINT "allowlist_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_alert_event_owner_fk" FOREIGN KEY ("alert_event_id","user_id") REFERENCES "public"."alert_events"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_portfolio_owner_fk" FOREIGN KEY ("portfolio_id","user_id") REFERENCES "public"."portfolios"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_portfolio_owner_fk" FOREIGN KEY ("portfolio_id","user_id") REFERENCES "public"."portfolios"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_watchlist_owner_fk" FOREIGN KEY ("watchlist_id","user_id") REFERENCES "public"."watchlists"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_successor_same_asset_fk" FOREIGN KEY ("superseded_by","asset_id") REFERENCES "public"."ai_analyses"("id","asset_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_targets" ADD CONSTRAINT "price_targets_signal_id_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signal_outcomes" ADD CONSTRAINT "signal_outcomes_signal_id_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingest_runs" ADD CONSTRAINT "ingest_runs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_health" ADD CONSTRAINT "provider_health_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alert_events_user_triggered_idx" ON "alert_events" USING btree ("user_id","triggered_at");--> statement-breakpoint
CREATE INDEX "alerts_user_active_idx" ON "alerts" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "allowlist_email_uniq" ON "allowlist" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "audit_log_user_occurred_idx" ON "audit_log" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "portfolios_user_name_uniq" ON "portfolios" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "positions_portfolio_asset_uniq" ON "positions" USING btree ("portfolio_id","asset_id");--> statement-breakpoint
CREATE INDEX "positions_user_idx" ON "positions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_refresh_token_hash_uniq" ON "sessions" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_expires_idx" ON "sessions" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX "transactions_user_portfolio_time_idx" ON "transactions" USING btree ("user_id","portfolio_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uniq" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "watchlist_items_user_idx" ON "watchlist_items" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "watchlists_user_name_uniq" ON "watchlists" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_analyses_asset_version_uniq" ON "ai_analyses" USING btree ("asset_id","version");--> statement-breakpoint
CREATE INDEX "ai_analyses_asset_created_idx" ON "ai_analyses" USING btree ("asset_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "signals_asset_inputs_hash_uniq" ON "signals" USING btree ("asset_id","inputs_hash");--> statement-breakpoint
CREATE INDEX "signals_asset_created_idx" ON "signals" USING btree ("asset_id","created_at");--> statement-breakpoint
CREATE INDEX "ingest_runs_source_started_idx" ON "ingest_runs" USING btree ("source_id","started_at");--> statement-breakpoint
CREATE INDEX "ingest_runs_kind_started_idx" ON "ingest_runs" USING btree ("job_kind","started_at");
