-- Admin scheduling: market locations, a weekly recurrence pattern that creates each next session,
-- and the retirement of draft sessions and session modes.
-- See intent/admin-scheduling/spec.md and plan.md.

-- A market location owns the time zone its local dates and times are read in. There is one for
-- now; the fixed id lets this migration backfill existing sessions by an explicit key.
CREATE TABLE "market_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"time_zone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

INSERT INTO "market_locations" ("id", "name", "time_zone")
VALUES ('b5c3f1a2-6d4e-4f7a-9c21-3e8d5a7b1c90', 'The Bay Church', 'America/Los_Angeles');

-- A weekly schedule: it occurs on the weekday of `starts_on`, with registration opening at the
-- local wall-clock time `registration_opens_at`. Lottery delay and auto-close are offsets in minutes;
-- null means a manual draw and no automatic close.
CREATE TABLE "recurrence_patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"starts_on" date NOT NULL,
	"registration_opens_at" time NOT NULL,
	"registration_duration_minutes" integer DEFAULT 60 NOT NULL,
	"capacity" integer NOT NULL,
	"lottery_delay_minutes" integer,
	"auto_close_after_minutes" integer DEFAULT 720,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurrence_patterns_location_id_market_locations_id_fk"
		FOREIGN KEY ("location_id") REFERENCES "public"."market_locations"("id"),
	CONSTRAINT "recurrence_patterns_duration_check"
		CHECK ("registration_duration_minutes" BETWEEN 1 AND 1440),
	CONSTRAINT "recurrence_patterns_capacity_check" CHECK ("capacity" BETWEEN 1 AND 10000),
	CONSTRAINT "recurrence_patterns_lottery_delay_check"
		CHECK ("lottery_delay_minutes" IS NULL OR "lottery_delay_minutes" BETWEEN 0 AND 120),
	CONSTRAINT "recurrence_patterns_auto_close_check"
		CHECK ("auto_close_after_minutes" IS NULL OR "auto_close_after_minutes" > 0)
);

-- One pattern per location for now. Dropping this index is the schema change for several.
CREATE UNIQUE INDEX "recurrence_patterns_location_idx"
	ON "recurrence_patterns" USING btree ("location_id");

CREATE TABLE "recurrence_pattern_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recurrence_pattern_id" uuid NOT NULL,
	"prompt" text NOT NULL,
	"type" text DEFAULT 'text' NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "recurrence_pattern_questions_pattern_id_fk"
		FOREIGN KEY ("recurrence_pattern_id") REFERENCES "public"."recurrence_patterns"("id")
		ON DELETE cascade
);

-- DATA-MUTATING: every existing session is assigned to the seeded location, by its explicit id.
ALTER TABLE "market_events" ADD COLUMN "location_id" uuid;
UPDATE "market_events"
SET "location_id" = 'b5c3f1a2-6d4e-4f7a-9c21-3e8d5a7b1c90'
WHERE "location_id" IS NULL;
ALTER TABLE "market_events" ALTER COLUMN "location_id" SET NOT NULL;
ALTER TABLE "market_events" ADD CONSTRAINT "market_events_location_id_market_locations_id_fk"
	FOREIGN KEY ("location_id") REFERENCES "public"."market_locations"("id");

-- Which pattern created a session; null for a one-off. Deleting a pattern keeps its sessions.
ALTER TABLE "market_events" ADD COLUMN "recurrence_pattern_id" uuid;
ALTER TABLE "market_events"
	ADD CONSTRAINT "market_events_recurrence_pattern_id_recurrence_patterns_id_fk"
	FOREIGN KEY ("recurrence_pattern_id") REFERENCES "public"."recurrence_patterns"("id")
	ON DELETE set null;

ALTER TABLE "market_events" ADD COLUMN "lottery_delay_minutes" integer;
ALTER TABLE "market_events" ADD CONSTRAINT "market_events_lottery_delay_check"
	CHECK ("lottery_delay_minutes" IS NULL OR "lottery_delay_minutes" >= 0);
ALTER TABLE "market_events" ADD COLUMN "auto_close_after_minutes" integer;
ALTER TABLE "market_events" ADD CONSTRAINT "market_events_auto_close_check"
	CHECK ("auto_close_after_minutes" IS NULL OR "auto_close_after_minutes" > 0);

-- DATA-MUTATING: `draft` no longer exists. Any remaining draft session is ended, not deleted.
UPDATE "market_events" SET "status" = 'ended' WHERE "status" = 'draft';

ALTER TABLE "market_events" DROP CONSTRAINT "market_events_status_check";
ALTER TABLE "market_events" ADD CONSTRAINT "market_events_status_check"
	CHECK (
		"status" IN (
			'scheduled',
			'registration_open',
			'registration_closed',
			'lottery_pending',
			'service_started',
			'ended'
		)
	);
ALTER TABLE "market_events" ALTER COLUMN "status" SET DEFAULT 'scheduled';

-- DESTRUCTIVE: session modes are retired. Its inline CHECK is dropped with the column.
ALTER TABLE "market_events" DROP COLUMN "session_mode";

-- At most one unfinished session per location. This fails if more than one exists already; that is
-- deliberate, rather than ending rows chosen by sort order (see docs/migrations.md).
CREATE UNIQUE INDEX "market_events_one_unfinished_per_location_idx"
	ON "market_events" USING btree ("location_id")
	WHERE "status" <> 'ended';
