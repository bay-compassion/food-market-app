ALTER TABLE "visits" ADD COLUMN "track" text NOT NULL DEFAULT 'lottery'
	CONSTRAINT "visits_track_check" CHECK ("track" IN ('lottery', 'premarket'));
