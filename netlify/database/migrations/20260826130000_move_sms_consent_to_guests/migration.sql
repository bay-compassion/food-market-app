DROP TABLE "sms_subscriptions";

CREATE TABLE "sms_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"guest_id" uuid NOT NULL REFERENCES "guests" ("id") ON DELETE CASCADE,
	"consented_at" timestamptz NOT NULL DEFAULT now(),
	"created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "sms_subscriptions_guest_idx" ON "sms_subscriptions" ("guest_id");
