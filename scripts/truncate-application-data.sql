-- Destructive: permanently removes every row from the application's tables.
-- Schema objects and migration bookkeeping are intentionally preserved.

BEGIN;

TRUNCATE TABLE
	public.notification_deliveries,
	public.push_subscriptions,
	public.sms_subscriptions,
	public.visits,
	public.registration_questions,
	public.market_events,
	public.guests
RESTART IDENTITY;

COMMIT;
