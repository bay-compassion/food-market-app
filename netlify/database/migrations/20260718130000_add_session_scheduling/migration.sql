ALTER TABLE "market_events"
	ADD COLUMN "session_mode" text NOT NULL DEFAULT 'scheduled'
	CHECK ("session_mode" IN ('scheduled', 'ad_hoc'));

ALTER TABLE "market_events" DROP CONSTRAINT "market_events_status_check";
ALTER TABLE "market_events" ADD CONSTRAINT "market_events_status_check"
	CHECK (
		"status" IN (
			'draft',
			'scheduled',
			'registration_open',
			'registration_closed',
			'service_started',
			'ended'
		)
	);
