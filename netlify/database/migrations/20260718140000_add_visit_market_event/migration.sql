ALTER TABLE "visits"
	ADD COLUMN "market_event_id" uuid REFERENCES "market_events"("id");

UPDATE "visits"
SET "market_event_id" = "guests"."market_event_id"
FROM "guests"
WHERE "visits"."guest_id" = "guests"."id";

ALTER TABLE "visits" ALTER COLUMN "market_event_id" SET NOT NULL;

CREATE INDEX "visits_market_event_id_visit_date_idx"
	ON "visits" ("market_event_id", "visit_date");
