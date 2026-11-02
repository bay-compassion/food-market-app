CREATE TABLE "lottery_odds_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"guest_id" uuid NOT NULL REFERENCES "guests"("id") ON DELETE CASCADE,
	"previous_weight" integer NOT NULL,
	"weight" integer NOT NULL CONSTRAINT "lottery_odds_changes_weight_check" CHECK ("weight" BETWEEN 1 AND 100),
	"market_event_id" uuid REFERENCES "market_events"("id") ON DELETE CASCADE,
	"ends_at" timestamptz,
	"reason" text NOT NULL,
	"note" text,
	"actor_id" text,
	"actor_name" text,
	"created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "lottery_odds_changes_guest_idx" ON "lottery_odds_changes" ("guest_id", "created_at");

ALTER TABLE "visits" ADD COLUMN "suggested_lottery_weight" integer;
ALTER TABLE "visits" ADD CONSTRAINT "visits_suggested_lottery_weight_check"
	CHECK ("suggested_lottery_weight" BETWEEN 1 AND 100);
