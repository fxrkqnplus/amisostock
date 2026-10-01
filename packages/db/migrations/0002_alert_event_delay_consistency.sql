ALTER TABLE "alert_events" DROP CONSTRAINT "alert_events_delay_nonnegative";--> statement-breakpoint
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_delay_freshness_check" CHECK (("alert_events"."freshness" = 'delayed' AND "alert_events"."delay_minutes" > 0)
        OR ("alert_events"."freshness" <> 'delayed' AND "alert_events"."delay_minutes" = 0));