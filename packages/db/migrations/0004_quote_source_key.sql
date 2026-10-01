ALTER TABLE "quotes" DROP CONSTRAINT "quotes_pkey";--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_asset_id_source_id_pk" PRIMARY KEY("asset_id","source_id");
