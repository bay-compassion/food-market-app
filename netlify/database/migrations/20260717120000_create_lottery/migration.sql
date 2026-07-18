CREATE TABLE "market_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"registration_opens_at" timestamptz NOT NULL,
	"registration_closes_at" timestamptz NOT NULL,
	"capacity" integer NOT NULL CHECK ("capacity" > 0),
	"status" text NOT NULL DEFAULT 'open' CHECK ("status" IN ('open', 'closed', 'drawn')),
	"created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "registration_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"market_event_id" uuid NOT NULL REFERENCES "market_events"("id") ON DELETE CASCADE,
	"prompt" text NOT NULL,
	"type" text NOT NULL DEFAULT 'text' CHECK ("type" IN ('text', 'scale')),
	"required" boolean NOT NULL DEFAULT false,
	"position" integer NOT NULL DEFAULT 0
);

ALTER TABLE "guests" ADD COLUMN "market_event_id" uuid REFERENCES "market_events"("id") ON DELETE SET NULL;
ALTER TABLE "guests" ADD COLUMN "answers" jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "guests" ADD COLUMN "source" text NOT NULL DEFAULT 'self' CHECK ("source" IN ('self', 'admin'));
ALTER TABLE "guests" ALTER COLUMN "status" SET DEFAULT 'registered';
UPDATE "guests" SET "status" = 'registered' WHERE "status" = 'queued';
ALTER TABLE "guests" ADD CONSTRAINT "guests_status_check"
	CHECK ("status" IN ('registered', 'waiting', 'served', 'not_placed', 'no_show'));

CREATE INDEX "guests_market_event_status_idx" ON "guests" ("market_event_id", "status");
CREATE INDEX "registration_questions_event_position_idx"
	ON "registration_questions" ("market_event_id", "position");
