CREATE TABLE "visit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"to_status" text NOT NULL,
	"actor_kind" text NOT NULL,
	"actor_id" text,
	"actor_name" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visit_events_visit_id_visits_id_fk"
		FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade
);

CREATE INDEX "visit_events_visit_idx" ON "visit_events" USING btree ("visit_id", "created_at");
