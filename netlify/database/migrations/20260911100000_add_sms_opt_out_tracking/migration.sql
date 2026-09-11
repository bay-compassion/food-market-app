CREATE TABLE "sms_opt_outs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"sender_phone" text NOT NULL,
	"opted_out_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sms_opt_outs_guest_id_guests_id_fk"
		FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade
);

CREATE UNIQUE INDEX "sms_opt_outs_guest_idx" ON "sms_opt_outs" USING btree ("guest_id");
