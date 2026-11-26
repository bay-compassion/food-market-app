-- The labels a note can be filed under. An admin adds and retires them from the dashboard;
-- retiring sets `archived_at` rather than deleting the row, so a note filed under a retired
-- category keeps its label.
CREATE TABLE "guest_note_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"label" text NOT NULL CONSTRAINT "guest_note_categories_label_check" CHECK (char_length(btrim("label")) BETWEEN 1 AND 40),
	"archived_at" timestamptz,
	"created_at" timestamptz NOT NULL DEFAULT now()
);

-- Two categories in use may not share a label; a retired one may share it with its replacement.
CREATE UNIQUE INDEX "guest_note_categories_active_label_idx"
	ON "guest_note_categories" (lower("label")) WHERE "archived_at" IS NULL;

INSERT INTO "guest_note_categories" ("label", "created_at") VALUES
	('Warning', now()),
	('Escalate to Lead', now() + interval '1 microsecond'),
	('Accommodation', now() + interval '2 microseconds');

-- What workers keep about a guest, one row per note. Read and written only through the admin API,
-- and never sent to the guest's own phone. `kind` says what the note records: `text` is freeform,
-- and the others are structured annotations whose particulars, if any, sit in `data`. Deleting the
-- guest deletes their notes.
CREATE TABLE "guest_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"guest_id" uuid NOT NULL REFERENCES "guests"("id") ON DELETE CASCADE,
	"market_event_id" uuid REFERENCES "market_events"("id") ON DELETE SET NULL,
	"category_id" uuid REFERENCES "guest_note_categories"("id"),
	"kind" text NOT NULL CONSTRAINT "guest_notes_kind_check" CHECK ("kind" IN ('text', 'screenshot_notice')),
	"body" text CONSTRAINT "guest_notes_body_check" CHECK (char_length("body") <= 2000),
	"data" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"author_id" text,
	"author_name" text,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "guest_notes_text_body_check" CHECK ("kind" <> 'text' OR "body" IS NOT NULL)
);

CREATE INDEX "guest_notes_guest_idx" ON "guest_notes" ("guest_id", "created_at");

-- Carry each guest's existing single staff note over as their first note. It belongs to no
-- session and no author, so only a holder of `manage:guest-notes` can change it. Nobody recorded
-- when it was written, so it is stamped with the time of this migration. `staff_notes` itself
-- stays for now and is dropped in a later migration, once this copy is confirmed.
INSERT INTO "guest_notes" ("guest_id", "kind", "body")
SELECT "id", 'text', left(btrim("staff_notes"), 2000)
FROM "guests"
WHERE "staff_notes" IS NOT NULL AND btrim("staff_notes") <> '';
