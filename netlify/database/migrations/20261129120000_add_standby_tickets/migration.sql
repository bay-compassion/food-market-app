-- A standby ticket: the place a guest pulls on the standby list by scanning the session's code at
-- the market, before they fill in their details. It holds the next S number, so the list keeps the
-- order guests scanned in, and it is spent once, when the guest's form arrives. Only the token's
-- hash is stored. See docs/standby.md.
--
-- New table only; nothing existing is changed. Deleting a session deletes its tickets, and deleting
-- the visit a ticket was spent on leaves the ticket without one.
CREATE TABLE "standby_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"market_event_id" uuid NOT NULL REFERENCES "market_events"("id") ON DELETE CASCADE,
	"token_hash" text NOT NULL UNIQUE,
	"standby_number" integer NOT NULL,
	"issued_at" timestamptz NOT NULL DEFAULT now(),
	"used_at" timestamptz,
	"visit_id" uuid REFERENCES "visits"("id") ON DELETE SET NULL,
	CONSTRAINT "standby_tickets_number_unique" UNIQUE ("market_event_id", "standby_number")
);
