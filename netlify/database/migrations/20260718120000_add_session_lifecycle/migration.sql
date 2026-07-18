ALTER TABLE "market_events" DROP CONSTRAINT "market_events_status_check";

WITH "newest_event" AS (
	SELECT "id" FROM "market_events" ORDER BY "created_at" DESC LIMIT 1
)
UPDATE "market_events"
SET "status" = 'ended'
WHERE "id" NOT IN (SELECT "id" FROM "newest_event");

UPDATE "market_events" SET "status" = 'registration_open' WHERE "status" = 'open';
UPDATE "market_events" SET "status" = 'registration_closed' WHERE "status" = 'closed';
UPDATE "market_events" SET "status" = 'service_started' WHERE "status" = 'drawn';

ALTER TABLE "market_events" ALTER COLUMN "status" SET DEFAULT 'draft';
ALTER TABLE "market_events" ADD CONSTRAINT "market_events_status_check"
	CHECK (
		"status" IN (
			'draft',
			'registration_open',
			'registration_closed',
			'service_started',
			'ended'
		)
	);
