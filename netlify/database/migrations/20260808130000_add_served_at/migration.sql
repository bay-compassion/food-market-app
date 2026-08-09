-- Additive and nullable, with no backfill on purpose: visits served before this column existed
-- have no record of when service finished, and copying `called_at` into them would invent a
-- zero-length wait. They stay NULL, and reporting counts them as unrecorded.
ALTER TABLE "visits" ADD COLUMN "served_at" timestamp with time zone;
