ALTER TABLE "notification_deliveries" ADD COLUMN "dedupe_key" text;
ALTER TABLE "notification_deliveries" ADD COLUMN "title" text;
ALTER TABLE "notification_deliveries" ADD COLUMN "body" text;

UPDATE "notification_deliveries" SET "dedupe_key" = "type";
ALTER TABLE "notification_deliveries" ALTER COLUMN "dedupe_key" SET NOT NULL;

ALTER TABLE "notification_deliveries" DROP CONSTRAINT "notification_deliveries_type_check";
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_type_check"
	CHECK ("type" IN (
		'registration_confirmed',
		'registration_closed',
		'lottery_selected',
		'lottery_not_selected',
		'called',
		'broadcast'
	));

DROP INDEX "notification_deliveries_visit_type_idx";
CREATE UNIQUE INDEX "notification_deliveries_visit_dedupe_idx"
	ON "notification_deliveries" ("visit_id", "dedupe_key");
