-- Household composition (age range, household size) moves from the guest's identity to a
-- per-visit snapshot, matching how `children_count`/`seniors_count` already work on `visits`.
-- Backfilled from `guests` keyed by the `guest_id` FK, then `household_size` is made NOT NULL
-- since every existing visit already has a guest with a real value, and every new insert will
-- supply it directly.
--
-- This is step 1 of backfill-then-drop: `guests.age_range` / `household_size` /
-- `children_count` / `seniors_count` are left in place on purpose. Application code stops
-- reading/writing them as of this change; dropping them is a separate, later migration once a
-- human confirms in production that every visit is getting a real snapshot (see
-- docs/migrations.md's backfill-then-drop rule).
ALTER TABLE "visits" ADD COLUMN "age_range" text;
ALTER TABLE "visits" ADD COLUMN "household_size" integer;

UPDATE "visits"
SET "age_range" = "guests"."age_range", "household_size" = "guests"."household_size"
FROM "guests"
WHERE "guests"."id" = "visits"."guest_id";

ALTER TABLE "visits" ALTER COLUMN "household_size" SET NOT NULL;

-- `guests.household_size` was NOT NULL with no default. Nothing writes to it anymore — identity
-- (sign-up) and registration inserts no longer supply it — so it has to allow NULL or every new
-- guest row would fail to insert.
ALTER TABLE "guests" ALTER COLUMN "household_size" DROP NOT NULL;
