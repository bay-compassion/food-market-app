-- Additive only. `age_range` is backfilled from the existing `age` column using the same bucket
-- thresholds `guestDemographics` already reports against, so reporting behaves the same either
-- way. Left nullable, and `age` is left in place (just loosened to nullable, since new guests no
-- longer collect it), on purpose: dropping `age` and requiring `age_range` is a separate, later
-- migration once this backfill is confirmed applied cleanly (see docs/migrations.md's
-- backfill-then-drop rule).
ALTER TABLE "guests" ALTER COLUMN "age" DROP NOT NULL;
ALTER TABLE "guests" ADD COLUMN "age_range" text;

UPDATE "guests"
SET "age_range" = CASE
	WHEN "age" < 18 THEN '0-17'
	WHEN "age" < 30 THEN '18-29'
	WHEN "age" < 45 THEN '30-44'
	WHEN "age" < 60 THEN '45-59'
	WHEN "age" < 75 THEN '60-74'
	ELSE '75+'
END
WHERE "age_range" IS NULL;

-- New shopper-composition counts, additive and defaulted so every existing row has an explicit
-- value with no backfill needed.
ALTER TABLE "guests" ADD COLUMN "children_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "guests" ADD COLUMN "seniors_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "visits" ADD COLUMN "children_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "visits" ADD COLUMN "seniors_count" integer NOT NULL DEFAULT 0;
