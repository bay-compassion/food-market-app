import { afterEach, describe, expect, it } from 'vitest';

import { guests, householdServiceEntries, marketEvents, visits } from '../../db/schema.mjs';
import {
	periodComposition,
	periodLottery,
	periodReach,
	sessionFacts,
	snapshots,
} from '../../db/warehouse-schema.mjs';
import { db, queueResult, resetDbStub } from '../test/dbStub.mjs';
import { SessionDeletion } from './session-deletion.mjs';

const marketEventId = '3c9e6a52-1f0b-4c47-9a1e-5b8d2f7e4a10';
// 9:30 in the morning on November 14 at the market.
const opensAt = new Date('2026-11-14T17:30:00.000Z');
const closesAt = new Date('2026-11-14T17:45:00.000Z');
const location = {
	id: 'location-1',
	name: 'The Bay Compassion',
	timeZone: 'America/Los_Angeles',
	createdAt: new Date('2026-07-01T00:00:00.000Z'),
};
const testGuest = { guestId: 'guest-test', firstName: 'Tess', lastName: 'Tester' };
/** The session's own snapshot and the month it fell in, as the warehouse query returns them. */
const coveringRows = [
	{
		id: 'snapshot-month',
		kind: 'month',
		periodStart: new Date('2026-11-01T07:00:00.000Z'),
		periodEnd: new Date('2026-12-01T08:00:00.000Z'),
		revision: 1,
	},
	{
		id: 'snapshot-session',
		kind: 'session',
		periodStart: opensAt,
		periodEnd: new Date(opensAt.getTime() + 1),
		revision: 1,
	},
];

type PreviewSetup = {
	found?: boolean;
	status?: string;
	warehoused?: boolean;
	sessionOnly?: (typeof testGuest)[];
	guestTotal?: number;
};

/**
 * Queues what one preview reads, in its order: the session with its location, any warehouse
 * snapshot covering it, the session-only guests, how many guests it had, then a count for each of
 * the seven tables it tallies. The cascades themselves are Postgres's; these tests cover the
 * decisions made before them.
 */
function queuePreview({
	found = true,
	status = 'ended',
	warehoused = false,
	sessionOnly = [testGuest],
	guestTotal = 2,
}: PreviewSetup = {}) {
	queueResult(
		found
			? [
					{
						event: {
							id: marketEventId,
							status,
							registrationOpensAt: opensAt,
							registrationClosesAt: closesAt,
						},
						location,
					},
				]
			: [],
	);

	if (!found) {
		return;
	}

	queueResult(warehoused ? coveringRows : []);
	queueResult(sessionOnly);
	queueResult([{ value: guestTotal }]);

	for (const value of [1, 2, 6, 3, 1, 2, 0]) {
		queueResult([{ value }]);
	}

	// Staff notes are counted only for the guests deleted with the session.
	if (sessionOnly.length) {
		queueResult([{ value: 5 }]);
	}
}

/** The tables `delete` was called on, in order. */
function deletedTables() {
	return (db.delete.mock.calls as unknown[][]).map(([table]) => table);
}

afterEach(() => {
	resetDbStub();
});

describe('SessionDeletion.preview', () => {
	it('reports the session, the guests who go with it, and how many rows each table holds', async () => {
		// Arrange
		queuePreview();

		// Act
		const preview = await new SessionDeletion(db as never, marketEventId).preview();

		// Assert
		expect(preview).toEqual({
			marketEventId,
			registrationOpensAt: opensAt.toISOString(),
			registrationClosesAt: closesAt.toISOString(),
			confirmation: '2026-11-14 09:30',
			blockedBy: null,
			coveringSnapshots: [],
			sessionOnlyGuests: [testGuest],
			keptGuests: 1,
			rows: {
				household_service_entries: 1,
				visits: 2,
				visit_events: 6,
				notification_deliveries: 3,
				push_subscriptions: 1,
				guests: 1,
				registration_questions: 2,
				lottery_odds_changes: 0,
				guest_notes: 5,
			},
		});
	});

	it('takes the confirmation’s date and time from the market’s time zone, not UTC', async () => {
		// Arrange: 8:30 in the evening on the 14th in Los Angeles is already the 15th in UTC.
		queueResult([
			{
				event: {
					id: marketEventId,
					status: 'ended',
					registrationOpensAt: new Date('2026-11-15T04:30:00.000Z'),
					registrationClosesAt: new Date('2026-11-15T04:45:00.000Z'),
				},
				location,
			},
		]);
		queueResult([]);
		queueResult([]);
		queueResult([{ value: 0 }]);

		for (let table = 0; table < 7; table += 1) {
			queueResult([{ value: 0 }]);
		}

		// Act
		const preview = await new SessionDeletion(db as never, marketEventId).preview();

		// Assert
		expect(preview?.confirmation).toBe('2026-11-14 20:30');
	});

	it('is blocked for a session that has not ended', async () => {
		// Arrange
		queuePreview({ status: 'lottery_drawn' });

		// Act
		const preview = await new SessionDeletion(db as never, marketEventId).preview();

		// Assert
		expect(preview?.blockedBy).toBe('not-ended');
	});

	it('is blocked once warehouse snapshots cover the session, and lists each of them', async () => {
		// Arrange
		queuePreview({ warehoused: true });

		// Act
		const preview = await new SessionDeletion(db as never, marketEventId).preview();

		// Assert
		expect(preview?.blockedBy).toBe('warehoused');
		expect(preview?.coveringSnapshots).toEqual([
			{
				id: 'snapshot-month',
				kind: 'month',
				periodStart: '2026-11-01T07:00:00.000Z',
				periodEnd: '2026-12-01T08:00:00.000Z',
				revision: 1,
			},
			{
				id: 'snapshot-session',
				kind: 'session',
				periodStart: opensAt.toISOString(),
				periodEnd: '2026-11-14T17:30:00.001Z',
				revision: 1,
			},
		]);
	});

	it('is null for a session that does not exist', async () => {
		// Arrange
		queuePreview({ found: false });

		// Act
		const preview = await new SessionDeletion(db as never, marketEventId).preview();

		// Assert
		expect(preview).toBeNull();
	});
});

describe('SessionDeletion.delete', () => {
	it('deletes the household counts, the visits, the session-only guests, then the session', async () => {
		// Arrange
		queuePreview();
		queueResult(undefined); // household_service_entries
		queueResult([]); // kept guests first seen here
		queueResult(undefined); // visits
		queueResult(undefined); // guests
		queueResult(undefined); // market_events

		// Act
		const result = await new SessionDeletion(db as never, marketEventId).delete('2026-11-14 09:30');

		// Assert
		expect(result).toMatchObject({ ok: true, rows: { visits: 2, guests: 1 } });
		expect(deletedTables()).toEqual([householdServiceEntries, visits, guests, marketEvents]);
		expect(db.update).not.toHaveBeenCalled();
	});

	it('keeps every guest record when each one also came to another session', async () => {
		// Arrange
		queuePreview({ sessionOnly: [] });
		queueResult(undefined);
		queueResult([]);
		queueResult(undefined);
		queueResult(undefined);

		// Act
		const result = await new SessionDeletion(db as never, marketEventId).delete('2026-11-14 09:30');

		// Assert
		expect(result).toMatchObject({ ok: true });
		expect(deletedTables()).toEqual([householdServiceEntries, visits, marketEvents]);
	});

	it('moves the first-visit flag to the earliest visit a kept guest has left', async () => {
		// Arrange
		queuePreview({ sessionOnly: [] });
		queueResult(undefined);
		queueResult([{ guestId: 'guest-returning' }]);
		queueResult(undefined); // visits
		queueResult(undefined); // the flag moved
		queueResult(undefined); // market_events

		// Act
		const result = await new SessionDeletion(db as never, marketEventId).delete('2026-11-14 09:30');

		// Assert
		expect(result).toMatchObject({ ok: true });
		expect(db.update).toHaveBeenCalledWith(visits);
	});

	it('deletes nothing when the typed time is another session’s on the same day', async () => {
		// Arrange
		queuePreview();

		// Act
		const result = await new SessionDeletion(db as never, marketEventId).delete('2026-11-14 14:00');

		// Assert
		expect(result).toMatchObject({ ok: false, status: 409 });
		expect(db.delete).not.toHaveBeenCalled();
	});

	it('deletes nothing while the session has not ended', async () => {
		// Arrange
		queuePreview({ status: 'registration_open' });

		// Act
		const result = await new SessionDeletion(db as never, marketEventId).delete('2026-11-14 09:30');

		// Assert
		expect(result).toMatchObject({ ok: false, status: 409 });
		expect(db.delete).not.toHaveBeenCalled();
	});

	it('removes the covering snapshots, facts first, before the operational rows when forced', async () => {
		// Arrange
		queuePreview({ warehoused: true });

		for (let table = 0; table < 5; table += 1) {
			queueResult(undefined); // four fact tables, then snapshots
		}
		queueResult(undefined); // household_service_entries
		queueResult([]); // kept guests first seen here
		queueResult(undefined); // visits
		queueResult(undefined); // guests
		queueResult(undefined); // market_events

		// Act
		const result = await new SessionDeletion(db as never, marketEventId).delete(
			'2026-11-14 09:30',
			{ force: true },
		);

		// Assert
		expect(result).toMatchObject({
			ok: true,
			removedSnapshots: [
				{ id: 'snapshot-month', kind: 'month' },
				{ id: 'snapshot-session', kind: 'session' },
			],
		});
		expect(deletedTables()).toEqual([
			sessionFacts,
			periodReach,
			periodComposition,
			periodLottery,
			snapshots,
			householdServiceEntries,
			visits,
			guests,
			marketEvents,
		]);
	});

	it('still refuses a session that has not ended when forced', async () => {
		// Arrange
		queuePreview({ status: 'lottery_drawn', warehoused: true });

		// Act
		const result = await new SessionDeletion(db as never, marketEventId).delete(
			'2026-11-14 09:30',
			{ force: true },
		);

		// Assert
		expect(result).toMatchObject({ ok: false, status: 409 });
		expect(db.delete).not.toHaveBeenCalled();
	});

	it('deletes nothing once the warehouse has recorded the session, unless forced', async () => {
		// Arrange
		queuePreview({ warehoused: true });

		// Act
		const result = await new SessionDeletion(db as never, marketEventId).delete('2026-11-14 09:30');

		// Assert
		expect(result).toMatchObject({ ok: false, status: 409 });
		expect(db.delete).not.toHaveBeenCalled();
	});

	it('answers 404 for a session already deleted', async () => {
		// Arrange
		queuePreview({ found: false });

		// Act
		const result = await new SessionDeletion(db as never, marketEventId).delete('2026-11-14 09:30');

		// Assert
		expect(result).toMatchObject({ ok: false, status: 404 });
		expect(db.delete).not.toHaveBeenCalled();
	});
});
