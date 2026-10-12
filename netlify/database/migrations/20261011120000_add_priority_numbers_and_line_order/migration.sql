-- A guest's queue number is what they carry: it is on their phone, in the "you were selected" text,
-- on their printed name tag, and in any screenshot they bring. Until now, putting a guest at the
-- front of the line renumbered everyone waiting behind them, so all of those went stale. The line's
-- order now lives in its own columns, and a number, once given, never changes.

-- The number of a guest a worker put at the front ahead of others, shown as P1, P2, … — a series
-- of its own, so the main numbers keep counting up and a waiting guest can still compare theirs with
-- the number being called.
ALTER TABLE "visits" ADD COLUMN "priority_number" integer;

-- Whether a worker put this guest at the front. Front-placed guests are called before everyone
-- else, first come first served among themselves.
ALTER TABLE "visits" ADD COLUMN "queue_front" boolean NOT NULL DEFAULT false;

-- The order guests are called in, within `queue_front`. Assigned increasing as guests join the
-- line, and rewritten when one is returned to the queue; never shown to anyone.
ALTER TABLE "visits" ADD COLUMN "queue_order" integer;

-- Every visit placed so far keeps its current order: until now the number was the order.
UPDATE "visits"
SET "queue_order" = "queue_position"
WHERE "queue_position" IS NOT NULL;
