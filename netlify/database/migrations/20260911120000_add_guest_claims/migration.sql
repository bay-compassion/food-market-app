CREATE TABLE "guest_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guest_claims_guest_id_guests_id_fk"
		FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade
);

CREATE UNIQUE INDEX "guest_claims_guest_idx" ON "guest_claims" USING btree ("guest_id");
CREATE UNIQUE INDEX "guest_claims_token_hash_idx" ON "guest_claims" USING btree ("token_hash");
