-- The long-term warehouse: frozen, anonymous, aggregate snapshots in their own schema, so they
-- are never mistaken for operational tables. Additive only: nothing here reads, changes, or
-- references the existing tables. See docs/data-warehousing.md.
CREATE SCHEMA "warehouse";

CREATE TABLE "warehouse"."snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"time_zone" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"supersedes" uuid,
	"definitions" text NOT NULL,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "snapshots_kind_period_revision_idx"
	ON "warehouse"."snapshots" USING btree ("kind", "period_start", "revision");

CREATE TABLE "warehouse"."session_facts" (
	"snapshot_id" uuid PRIMARY KEY NOT NULL,
	"capacity" integer NOT NULL,
	"sign_ups" integer NOT NULL,
	"served" integer NOT NULL,
	"no_shows" integer NOT NULL,
	"not_placed" integer NOT NULL,
	"worker_added" integer NOT NULL,
	"median_wait_minutes" double precision,
	"longest_wait_minutes" double precision,
	"untimed" integer NOT NULL,
	CONSTRAINT "session_facts_snapshot_id_snapshots_id_fk"
		FOREIGN KEY ("snapshot_id") REFERENCES "warehouse"."snapshots"("id")
);

CREATE TABLE "warehouse"."period_reach" (
	"snapshot_id" uuid PRIMARY KEY NOT NULL,
	"sessions" integer NOT NULL,
	"visits_served" integer NOT NULL,
	"unique_people" integer NOT NULL,
	"unique_households" integer NOT NULL,
	"household_members" integer NOT NULL,
	"children" integer NOT NULL,
	"seniors" integer NOT NULL,
	"first_time_people" integer NOT NULL,
	CONSTRAINT "period_reach_snapshot_id_snapshots_id_fk"
		FOREIGN KEY ("snapshot_id") REFERENCES "warehouse"."snapshots"("id")
);

CREATE TABLE "warehouse"."period_composition" (
	"snapshot_id" uuid NOT NULL,
	"category" text NOT NULL,
	"value" text NOT NULL,
	"people" integer NOT NULL,
	CONSTRAINT "period_composition_pkey" PRIMARY KEY ("snapshot_id", "category", "value"),
	CONSTRAINT "period_composition_snapshot_id_snapshots_id_fk"
		FOREIGN KEY ("snapshot_id") REFERENCES "warehouse"."snapshots"("id")
);

CREATE TABLE "warehouse"."period_lottery" (
	"snapshot_id" uuid NOT NULL,
	"lottery_weight" integer NOT NULL,
	"entries" integer NOT NULL,
	"placed" integer NOT NULL,
	CONSTRAINT "period_lottery_pkey" PRIMARY KEY ("snapshot_id", "lottery_weight"),
	CONSTRAINT "period_lottery_snapshot_id_snapshots_id_fk"
		FOREIGN KEY ("snapshot_id") REFERENCES "warehouse"."snapshots"("id")
);
