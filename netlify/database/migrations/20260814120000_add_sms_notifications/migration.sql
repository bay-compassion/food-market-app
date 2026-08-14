ALTER TABLE "notification_deliveries" ADD COLUMN "channel" text NOT NULL DEFAULT 'push';
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_channel_check"
	CHECK ("channel" IN ('push', 'sms'));

DROP INDEX "notification_deliveries_visit_dedupe_idx";
CREATE UNIQUE INDEX "notification_deliveries_visit_dedupe_channel_idx"
	ON "notification_deliveries" ("visit_id", "dedupe_key", "channel");

CREATE TABLE "sms_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"visit_id" uuid NOT NULL REFERENCES "visits" ("id") ON DELETE CASCADE,
	"consented_at" timestamptz NOT NULL DEFAULT now(),
	"created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "sms_subscriptions_visit_idx" ON "sms_subscriptions" ("visit_id");
