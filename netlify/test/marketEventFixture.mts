import type { MarketEventRow } from '../services/marketSession.mjs';

/** A market event row for service tests: a one-off session whose registration window spans now. */
export function baseEvent(overrides: Partial<MarketEventRow> = {}): MarketEventRow {
	return {
		id: 'event-1',
		locationId: 'location-1',
		recurrencePatternId: null,
		status: 'registration_open',
		capacity: 10,
		registrationOpensAt: new Date(Date.now() - 3_600_000),
		registrationClosesAt: new Date(Date.now() + 3_600_000),
		registrationGraceEndsAt: null,
		lotteryDelayMinutes: null,
		autoCloseAfterMinutes: null,
		createdAt: new Date(),
		...overrides,
	};
}
