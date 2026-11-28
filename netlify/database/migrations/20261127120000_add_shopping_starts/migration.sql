-- When shopping starts: the published time a market lists for guests, separate from the draw.
-- A pattern holds it as wall-clock time at the location, as it does `registration_opens_at`; each
-- session copies it as an instant and may override it. Both are nullable and nothing is backfilled:
-- a worker sets the time on the Schedule screen, and until then there is none to show.
ALTER TABLE "recurrence_patterns" ADD COLUMN "shopping_starts_at" time;
ALTER TABLE "market_events" ADD COLUMN "shopping_starts_at" timestamptz;
