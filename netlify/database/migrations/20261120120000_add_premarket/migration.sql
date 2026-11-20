ALTER TABLE "visits" ADD COLUMN "track" text NOT NULL DEFAULT 'lottery'
	CONSTRAINT "visits_track_check" CHECK ("track" IN ('lottery', 'premarket'));

CREATE TABLE "premarket_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"location_id" uuid NOT NULL REFERENCES "market_locations"("id"),
	"code" text NOT NULL,
	"created_by_id" text,
	"created_by_name" text,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"replaced_at" timestamptz
);

CREATE UNIQUE INDEX "premarket_codes_code_idx" ON "premarket_codes" ("code");
CREATE UNIQUE INDEX "premarket_codes_one_live_per_location_idx" ON "premarket_codes" ("location_id")
	WHERE "replaced_at" IS NULL;
