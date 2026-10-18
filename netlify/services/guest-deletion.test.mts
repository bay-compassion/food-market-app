import { afterEach, describe, expect, it } from 'vitest';

import { guests, visits } from '../../db/schema.mjs';
import { db, queueResult, resetDbStub } from '../test/dbStub.mjs';
import { GuestDeletion } from './guest-deletion.mjs';

const guestId = '7d1e1f4a-2c3b-4d5e-8f90-1a2b3c4d5e6f';
const signedUp = new Date('2026-09-27T17:00:00.000Z');

/**
 * Queues what one preview reads, in its order: the guest, a count for each of the seven tables,
 * then any visit in a session that has not ended. The cascades themselves are Postgres's; these
 * tests cover the decisions made before them.
 */
function queuePreview({ found = true, openVisit = false } = {}) {
	queueResult(
		found
			? [{ firstName: 'Ari', lastName: 'Guest', phone: '(925) 555-0100', createdAt: signedUp }]
			: [],
	);

	if (!found) {
		return;
	}

	for (const value of [3, 2, 1, 1, 1, 0, 0]) {
		queueResult([{ value }]);
	}
	queueResult(openVisit ? [{ id: 'visit-open' }] : []);
}

/** The tables `delete` was called on, in order. */
function deletedTables() {
	return (db.delete.mock.calls as unknown[][]).map(([table]) => table);
}

afterEach(() => {
	resetDbStub();
});

describe('GuestDeletion.preview', () => {
	it('reports the guest and how many rows each table holds about them', async () => {
		// Arrange
		queuePreview();

		// Act
		const preview = await new GuestDeletion(db as never, guestId).preview();

		// Assert
		expect(preview).toEqual({
			guestId,
			firstName: 'Ari',
			lastName: 'Guest',
			phone: '(925) 555-0100',
			signedUpAt: signedUp.toISOString(),
			inOpenSession: false,
			rows: {
				visits: 3,
				visit_events: 2,
				notification_deliveries: 1,
				push_subscriptions: 1,
				sms_subscriptions: 1,
				sms_opt_outs: 0,
				guest_claims: 0,
			},
		});
	});

	it('is null for a guest who does not exist', async () => {
		// Arrange
		queuePreview({ found: false });

		// Act
		const preview = await new GuestDeletion(db as never, guestId).preview();

		// Assert
		expect(preview).toBeNull();
	});
});

describe('GuestDeletion.delete', () => {
	it('deletes the visits, then the guest, when the typed number is theirs', async () => {
		// Arrange
		queuePreview();
		queueResult(undefined);
		queueResult(undefined);

		// Act
		const result = await new GuestDeletion(db as never, guestId).delete('+1 925-555-0100');

		// Assert
		expect(result).toEqual({ ok: true });
		expect(deletedTables()).toEqual([visits, guests]);
	});

	it('deletes nothing when the typed number is not theirs', async () => {
		// Arrange
		queuePreview();

		// Act
		const result = await new GuestDeletion(db as never, guestId).delete('925-555-0199');

		// Assert
		expect(result).toMatchObject({ ok: false, status: 409 });
		expect(db.delete).not.toHaveBeenCalled();
	});

	it('deletes nothing while the guest is in a session that has not ended', async () => {
		// Arrange
		queuePreview({ openVisit: true });

		// Act
		const result = await new GuestDeletion(db as never, guestId).delete('925-555-0100');

		// Assert
		expect(result).toMatchObject({ ok: false, status: 409 });
		expect(db.delete).not.toHaveBeenCalled();
	});

	it('answers 404 for a guest already deleted', async () => {
		// Arrange
		queuePreview({ found: false });

		// Act
		const result = await new GuestDeletion(db as never, guestId).delete('925-555-0100');

		// Assert
		expect(result).toMatchObject({ ok: false, status: 404 });
		expect(db.delete).not.toHaveBeenCalled();
	});
});
