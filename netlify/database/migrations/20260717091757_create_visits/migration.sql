CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"guest_id" uuid NOT NULL REFERENCES "guests"("id"),
	"visit_date" date NOT NULL,
	"is_first_visit" boolean NOT NULL DEFAULT false
);

CREATE INDEX "visits_guest_id_visit_date_idx" ON "visits" ("guest_id", "visit_date");
