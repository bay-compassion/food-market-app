import type { MarketEventRow } from '../services/marketSession.mjs';

/** A market event row for service tests, defaulting to a draft whose registration is open now. */
export function baseEvent(overrides: Partial<MarketEventRow> = {}): MarketEventRow {
	return {
		id: 'event-1',
		status: 'draft',
		sessionMode: 'scheduled',
		capacity: 10,
		registrationOpensAt: new Date(Date.now() - 3_600_000),
		registrationClosesAt: new Date(Date.now() + 3_600_000),
		createdAt: new Date(),
		...overrides,
	} as MarketEventRow;
}
