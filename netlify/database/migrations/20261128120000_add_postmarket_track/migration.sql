-- Standby guests join a third track, `postmarket`: an airline-style list after the main line, with
-- no guarantee of food. See docs/standby.md.
--
-- Widening the track check means dropping and re-adding it. Every existing row is `lottery` or
-- `premarket`, so the new check holds for all of them; nothing is rewritten.
ALTER TABLE "visits" DROP CONSTRAINT "visits_track_check";
ALTER TABLE "visits" ADD CONSTRAINT "visits_track_check"
	CHECK ("track" IN ('lottery', 'premarket', 'postmarket'));

-- A standby guest's number, shown as S1, S2, …, in the order they joined. Only a postmarket visit
-- carries one, and no two in a session share one.
ALTER TABLE "visits" ADD COLUMN "standby_number" integer
	CONSTRAINT "visits_standby_number_check" CHECK ("standby_number" IS NULL OR "track" = 'postmarket');
CREATE UNIQUE INDEX "visits_standby_number_idx"
	ON "visits" ("market_event_id", "standby_number") WHERE "standby_number" IS NOT NULL;
