CREATE TABLE "household_service_entries" (
 "id" uuid PRIMARY KEY,
 "market_event_id" uuid NOT NULL REFERENCES "market_events"("id"),
 "household_size" integer NOT NULL CONSTRAINT "household_service_entries_size_check" CHECK ("household_size" BETWEEN 1 AND 30),
 "initial_household_size" integer NOT NULL,
 "created_by" text,
 "updated_by" text,
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "updated_at" timestamptz NOT NULL DEFAULT now(),
 "voided_at" timestamptz,
 "version" integer NOT NULL DEFAULT 1
);
CREATE INDEX "household_service_entries_event_idx" ON "household_service_entries" ("market_event_id");
