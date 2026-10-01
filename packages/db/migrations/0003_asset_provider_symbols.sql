CREATE TABLE "asset_provider_symbols" (
	"asset_id" uuid NOT NULL,
	"provider_id" text NOT NULL,
	"provider_symbol" text NOT NULL,
	CONSTRAINT "asset_provider_symbols_asset_id_provider_id_pk" PRIMARY KEY("asset_id","provider_id"),
	CONSTRAINT "asset_provider_symbols_provider_symbol_unique" UNIQUE("provider_id","provider_symbol"),
	CONSTRAINT "asset_provider_symbols_provider_id_check" CHECK ("asset_provider_symbols"."provider_id" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'),
	CONSTRAINT "asset_provider_symbols_symbol_check" CHECK (length(btrim("asset_provider_symbols"."provider_symbol")) > 0)
);
--> statement-breakpoint
ALTER TABLE "asset_provider_symbols" ADD CONSTRAINT "asset_provider_symbols_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;