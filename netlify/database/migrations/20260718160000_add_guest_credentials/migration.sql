ALTER TABLE "guests" ADD COLUMN "normalized_phone" text;
ALTER TABLE "guests" ADD COLUMN "pin_hash" text;

UPDATE "guests"
SET "normalized_phone" = '+' || CASE
	WHEN length(regexp_replace("phone", '[^0-9]', '', 'g')) = 10
		THEN '1' || regexp_replace("phone", '[^0-9]', '', 'g')
	ELSE regexp_replace("phone", '[^0-9]', '', 'g')
END;

ALTER TABLE "guests" ALTER COLUMN "normalized_phone" SET NOT NULL;
CREATE INDEX "guests_normalized_phone_idx" ON "guests" ("normalized_phone");

ALTER TABLE "visits" ADD COLUMN "access_token_hash" text;
UPDATE "visits"
SET "access_token_hash" = encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex');
ALTER TABLE "visits" ALTER COLUMN "access_token_hash" SET NOT NULL;
ALTER TABLE "visits" ADD CONSTRAINT "visits_access_token_hash_unique" UNIQUE ("access_token_hash");

ALTER TABLE "visits" DROP CONSTRAINT "visits_status_check";
ALTER TABLE "visits" ADD CONSTRAINT "visits_status_check"
	CHECK ("status" IN ('registered', 'waiting', 'served', 'not_placed', 'no_show', 'cancelled'));

CREATE UNIQUE INDEX "visits_guest_market_event_idx" ON "visits" ("guest_id", "market_event_id");

CREATE TABLE "guest_pin_attempts" (
	"normalized_phone" text PRIMARY KEY,
	"failure_count" integer NOT NULL DEFAULT 0,
	"window_started_at" timestamptz NOT NULL DEFAULT now(),
	"locked_until" timestamptz
);
