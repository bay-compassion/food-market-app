import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../test/dbStub.mjs';

vi.mock('../../db/index.mjs', () => ({ db }));

import { guestClaimLifetimeMs, issueGuestClaim, redeemGuestClaim } from './guest-claim.mjs';
import { hashClaimToken, hashDeviceToken, hashVisitToken } from './guestCredentials.mjs';

const now = new Date('2026-09-12T17:00:00.000Z');
const claimToken = 'claim-token-shown-as-a-qr-code-1234567890abcdef';
const identity = { firstName: 'Ari', lastName: 'Guest', phone: '555-123-4567' };

/** The object a chained call like `db.update(table).set(...)` was built on, by call order. */
function chainAt(method: 'insert' | 'update' | 'delete', index: number) {
	return db[method].mock.results[index]!.value as Record<string, ReturnType<typeof vi.fn>>;
}

afterEach(() => {
	resetDbStub();
});

describe('issueGuestClaim', () => {
	it('stores only the hash of a fresh code that expires fifteen minutes from now', async () => {
		// Arrange
		queueResult([{ deviceTokenHash: null }]);
		queueResult([]);

		// Act
		const result = await issueGuestClaim('guest-1', now);

		// Assert
		expect(result.ok).toBe(true);
		const { token, expiresAt } = result.ok ? result.body : { token: '', expiresAt: '' };
		const stored = chainAt('insert', 0).values!.mock.calls[0]![0];

		expect(expiresAt).toBe(new Date(now.valueOf() + guestClaimLifetimeMs).toISOString());
		expect(token.length).toBeGreaterThanOrEqual(32);
		expect(stored).toMatchObject({ guestId: 'guest-1', tokenHash: hashClaimToken(token) });
		expect(JSON.stringify(stored)).not.toContain(token);
	});

	it('replaces an earlier outstanding code for the same guest', async () => {
		// Arrange
		queueResult([{ deviceTokenHash: null }]);
		queueResult([]);

		// Act
		await issueGuestClaim('guest-1', now);

		// Assert
		expect(chainAt('insert', 0).onConflictDoUpdate).toHaveBeenCalledOnce();
	});

	it('refuses a guest whose record a phone has already adopted', async () => {
		// Arrange
		queueResult([{ deviceTokenHash: 'already-on-a-phone' }]);

		// Act
		const result = await issueGuestClaim('guest-1', now);

		// Assert
		expect(result).toEqual({
			ok: false,
			status: 409,
			error: "This guest's record is already on a phone.",
		});
		expect(db.insert).not.toHaveBeenCalled();
	});

	it('reports an unknown guest as not found', async () => {
		// Arrange
		queueResult([]);

		// Act
		const result = await issueGuestClaim('guest-1', now);

		// Assert
		expect(result).toMatchObject({ ok: false, status: 404 });
		expect(db.insert).not.toHaveBeenCalled();
	});
});

describe('redeemGuestClaim', () => {
	it('issues a device credential, re-keys the current visit, and returns the identity', async () => {
		// Arrange
		queueResult([{ id: 'claim-1', guestId: 'guest-1' }]);
		queueResult([]); // claim deleted
		queueResult([identity]);
		queueResult([{ id: 'event-1' }]);
		queueResult([{ id: 'visit-1', marketEventId: 'event-1', status: 'waiting' }]);
		queueResult([]); // visit re-keyed

		// Act
		const claimed = await redeemGuestClaim(claimToken, now);

		// Assert
		expect(claimed).toMatchObject({
			identity,
			visit: { id: 'visit-1', marketEventId: 'event-1', status: 'waiting' },
		});
		expect(chainAt('update', 0).set).toHaveBeenCalledWith({
			deviceTokenHash: hashDeviceToken(claimed!.deviceToken),
		});
		expect(chainAt('update', 1).set).toHaveBeenCalledWith({
			accessTokenHash: hashVisitToken(claimed!.visit!.visitToken),
		});
		expect(db.delete).toHaveBeenCalledOnce();
	});

	it('still hands over the identity when the guest has no visit in a live session', async () => {
		// Arrange
		queueResult([{ id: 'claim-1', guestId: 'guest-1' }]);
		queueResult([]);
		queueResult([identity]);
		queueResult([]); // no session that has not ended

		// Act
		const claimed = await redeemGuestClaim(claimToken, now);

		// Assert
		expect(claimed).toMatchObject({ identity, visit: null });
		expect(db.update).toHaveBeenCalledOnce();
	});

	it('rejects an unknown, expired, or already-used code without issuing anything', async () => {
		// Arrange
		queueResult([]);

		// Act
		const claimed = await redeemGuestClaim(claimToken, now);

		// Assert
		expect(claimed).toBeNull();
		expect(db.update).not.toHaveBeenCalled();
		expect(db.delete).not.toHaveBeenCalled();
	});

	it('rejects a code whose guest a phone adopted in the meantime', async () => {
		// Arrange
		queueResult([{ id: 'claim-1', guestId: 'guest-1' }]);
		queueResult([]);
		queueResult([]); // the device credential was no longer empty

		// Act
		const claimed = await redeemGuestClaim(claimToken, now);

		// Assert
		expect(claimed).toBeNull();
		expect(db.update).toHaveBeenCalledOnce();
	});
});
