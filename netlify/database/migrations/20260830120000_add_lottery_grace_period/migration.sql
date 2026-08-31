-- Persist the end of the short post-close grace period. Existing sessions derive their fallback
-- deadline from registration_closes_at in application code, so this additive column needs no
-- data rewrite.
ALTER TABLE "market_events"
	ADD COLUMN "registration_grace_ends_at" timestamptz;

-- `lottery_pending` freezes the registration pool before the draw starts.
ALTER TABLE "market_events" DROP CONSTRAINT "market_events_status_check";
ALTER TABLE "market_events" ADD CONSTRAINT "market_events_status_check"
	CHECK (
		"status" IN (
			'draft',
			'scheduled',
			'registration_open',
			'registration_closed',
			'lottery_pending',
			'service_started',
			'ended'
		)
	);
