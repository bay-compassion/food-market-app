ALTER TABLE "visits" ADD COLUMN "status" text NOT NULL DEFAULT 'registered';
ALTER TABLE "visits" ADD COLUMN "answers" jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "visits" ADD COLUMN "source" text NOT NULL DEFAULT 'self';
ALTER TABLE "visits" ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT now();
ALTER TABLE "visits" ALTER COLUMN "visit_date" SET DEFAULT CURRENT_DATE;

UPDATE "visits"
SET
	"status" = "guests"."status",
	"answers" = "guests"."answers",
	"source" = "guests"."source",
	"created_at" = "guests"."created_at"
FROM "guests"
WHERE "visits"."guest_id" = "guests"."id";

INSERT INTO "visits" (
	"guest_id",
	"market_event_id",
	"status",
	"answers",
	"source",
	"visit_date",
	"is_first_visit",
	"created_at"
)
SELECT
	"guests"."id",
	"guests"."market_event_id",
	"guests"."status",
	"guests"."answers",
	"guests"."source",
	("guests"."created_at" AT TIME ZONE 'UTC')::date,
	true,
	"guests"."created_at"
FROM "guests"
WHERE
	"guests"."market_event_id" IS NOT NULL
	AND NOT EXISTS (
		SELECT 1 FROM "visits" WHERE "visits"."guest_id" = "guests"."id"
	);

ALTER TABLE "visits" ADD CONSTRAINT "visits_status_check"
	CHECK ("status" IN ('registered', 'waiting', 'served', 'not_placed', 'no_show'));
ALTER TABLE "visits" ADD CONSTRAINT "visits_source_check"
	CHECK ("source" IN ('self', 'admin'));

CREATE INDEX "visits_market_event_status_idx" ON "visits" ("market_event_id", "status");

DROP INDEX IF EXISTS "guests_market_event_status_idx";
ALTER TABLE "guests" DROP CONSTRAINT IF EXISTS "guests_status_check";
ALTER TABLE "guests" DROP COLUMN "market_event_id";
ALTER TABLE "guests" DROP COLUMN "status";
ALTER TABLE "guests" DROP COLUMN "answers";
ALTER TABLE "guests" DROP COLUMN "source";
