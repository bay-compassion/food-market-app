ALTER TABLE "guests" ADD COLUMN "device_token_hash" text;
CREATE UNIQUE INDEX "guests_device_token_hash_idx" ON "guests" ("device_token_hash");
ALTER TABLE "visits" ADD COLUMN "normalized_phone" text;
