CREATE TABLE "period_composition" (
	"snapshot_id" uuid,
	"category" text,
	"value" text,
	"people" integer NOT NULL,
	CONSTRAINT "period_composition_pkey" PRIMARY KEY("snapshot_id","category","value")
);
--> statement-breakpoint
CREATE TABLE "period_lottery" (
	"snapshot_id" uuid,
	"lottery_weight" integer,
	"entries" integer NOT NULL,
	"placed" integer NOT NULL,
	CONSTRAINT "period_lottery_pkey" PRIMARY KEY("snapshot_id","lottery_weight")
);
--> statement-breakpoint
CREATE TABLE "period_reach" (
	"snapshot_id" uuid PRIMARY KEY,
	"sessions" integer NOT NULL,
	"visits_served" integer NOT NULL,
	"unique_people" integer NOT NULL,
	"unique_households" integer NOT NULL,
	"household_members" integer NOT NULL,
	"children" integer NOT NULL,
	"seniors" integer NOT NULL,
	"first_time_people" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_facts" (
	"snapshot_id" uuid PRIMARY KEY,
	"capacity" integer NOT NULL,
	"sign_ups" integer NOT NULL,
	"served" integer NOT NULL,
	"no_shows" integer NOT NULL,
	"not_placed" integer NOT NULL,
	"worker_added" integer NOT NULL,
	"median_wait_minutes" double precision,
	"longest_wait_minutes" double precision,
	"untimed" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"kind" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"time_zone" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"supersedes" uuid,
	"definitions" text NOT NULL,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "snapshots_kind_period_revision_idx" ON "snapshots" ("kind","period_start","revision");--> statement-breakpoint
ALTER TABLE "period_composition" ADD CONSTRAINT "period_composition_snapshot_id_snapshots_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "snapshots"("id");--> statement-breakpoint
ALTER TABLE "period_lottery" ADD CONSTRAINT "period_lottery_snapshot_id_snapshots_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "snapshots"("id");--> statement-breakpoint
ALTER TABLE "period_reach" ADD CONSTRAINT "period_reach_snapshot_id_snapshots_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "snapshots"("id");--> statement-breakpoint
ALTER TABLE "session_facts" ADD CONSTRAINT "session_facts_snapshot_id_snapshots_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "snapshots"("id");