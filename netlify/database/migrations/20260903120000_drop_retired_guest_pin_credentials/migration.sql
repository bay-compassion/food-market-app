-- Destructive cleanup after the separate device-identity migration and application rollout.
-- PIN hashes and failed-attempt history are retired; no backfill is needed or intended.
-- Human review must confirm the device-identity rollout and validate a deploy preview before merge.
ALTER TABLE "guests" DROP COLUMN "pin_hash";
DROP TABLE "guest_pin_attempts";
