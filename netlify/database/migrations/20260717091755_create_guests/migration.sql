CREATE TABLE "guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"age" integer NOT NULL CHECK ("age" BETWEEN 0 AND 120),
	"household_size" integer NOT NULL CHECK ("household_size" BETWEEN 1 AND 30),
	"phone" text NOT NULL,
	"locale" text NOT NULL,
	"status" text NOT NULL DEFAULT 'queued',
	"created_at" timestamptz NOT NULL DEFAULT now()
);
