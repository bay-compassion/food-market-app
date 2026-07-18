ALTER TABLE "visits" ADD COLUMN "queue_position" integer;
ALTER TABLE "visits" ADD COLUMN "called_at" timestamptz;

ALTER TABLE "visits" DROP CONSTRAINT "visits_status_check";
ALTER TABLE "visits" ADD CONSTRAINT "visits_status_check"
	CHECK ("status" IN ('registered', 'waiting', 'called', 'served', 'not_placed', 'no_show', 'cancelled'));

CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"visit_id" uuid NOT NULL REFERENCES "visits" ("id") ON DELETE CASCADE,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "push_subscriptions_visit_idx" ON "push_subscriptions" ("visit_id");
CREATE UNIQUE INDEX "push_subscriptions_endpoint_idx" ON "push_subscriptions" ("endpoint");

CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"visit_id" uuid NOT NULL REFERENCES "visits" ("id") ON DELETE CASCADE,
	"type" text NOT NULL,
	"status" text NOT NULL DEFAULT 'pending',
	"attempts" integer NOT NULL DEFAULT 0,
	"last_error" text,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"sent_at" timestamptz,
	CONSTRAINT "notification_deliveries_status_check"
		CHECK ("status" IN ('pending', 'sent', 'failed', 'skipped')),
	CONSTRAINT "notification_deliveries_type_check"
		CHECK ("type" IN (
			'registration_confirmed',
			'registration_closed',
			'lottery_selected',
			'lottery_not_selected',
			'called'
		))
);

CREATE UNIQUE INDEX "notification_deliveries_visit_type_idx"
	ON "notification_deliveries" ("visit_id", "type");
CREATE INDEX "notification_deliveries_status_idx"
	ON "notification_deliveries" ("status", "created_at");
