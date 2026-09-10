ALTER TABLE "notification_deliveries"
	ADD COLUMN "claimed_at" timestamp with time zone,
	ADD COLUMN "claimed_by" text;

CREATE INDEX "notification_deliveries_claim_idx"
	ON "notification_deliveries" ("status", "channel", "claimed_at", "created_at");
