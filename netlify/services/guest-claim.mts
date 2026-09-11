import { and, eq, gt, isNull } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { guestClaims, guests, visits } from '../../db/schema.mjs';
import type { VisitStatus } from '../../src/services/visitStateMachine.js';
import { currentMarketVisitForGuest } from './current-visit.mjs';
import {
	hashClaimToken,
	issueClaimToken,
	issueDeviceToken,
	issueVisitToken,
} from './guestCredentials.mjs';

/** Long enough for a guest to find their phone at the table; short enough that a photo goes stale. */
export const guestClaimLifetimeMs = 15 * 60_000;

export type IssueGuestClaimResult =
	| { ok: true; body: { token: string; expiresAt: string } }
	| { ok: false; status: 404 | 409; error: string };

export type RedeemedGuestClaim = {
	deviceToken: string;
	identity: { firstName: string; lastName: string; phone: string };
	visit: { id: string; marketEventId: string; status: VisitStatus; visitToken: string } | null;
};

/**
 * Issues the code a worker shows as a QR code, replacing any earlier code for the same guest.
 *
 * Only a guest no phone has adopted yet can be claimed. Every manual add creates a fresh guest with
 * no device credential, so this never gets in the way of the intended flow — but it does stop a
 * worker from handing a guest who registered on their own phone over to somebody else's.
 */
export async function issueGuestClaim(
	guestId: string,
	now = new Date(),
): Promise<IssueGuestClaimResult> {
	const [guest] = await db
		.select({ deviceTokenHash: guests.deviceTokenHash })
		.from(guests)
		.where(eq(guests.id, guestId))
		.limit(1);

	if (!guest) {
		return { ok: false, status: 404, error: 'That guest could not be found.' };
	}

	if (guest.deviceTokenHash !== null) {
		return { ok: false, status: 409, error: "This guest's record is already on a phone." };
	}

	const { token, tokenHash } = issueClaimToken();
	const expiresAt = new Date(now.valueOf() + guestClaimLifetimeMs);

	await db
		.insert(guestClaims)
		.values({ guestId, tokenHash, expiresAt, createdAt: now })
		.onConflictDoUpdate({
			target: guestClaims.guestId,
			set: { tokenHash, expiresAt, createdAt: now },
		});

	return { ok: true, body: { token, expiresAt: expiresAt.toISOString() } };
}

/**
 * Hands the claimed guest to the phone presenting `token`: a new device credential, a new credential
 * for their current visit, and the identity the phone keeps locally. Resolves to `null` for a code
 * that is unknown, expired, or already used — deliberately indistinguishable to the caller.
 *
 * The visit's previous credential was never given to anyone (a worker-added visit's token is not
 * returned), so replacing it revokes nothing.
 */
export async function redeemGuestClaim(
	token: string,
	now = new Date(),
): Promise<RedeemedGuestClaim | null> {
	return db.transaction(async (tx) => {
		const [claim] = await tx
			.select({ id: guestClaims.id, guestId: guestClaims.guestId })
			.from(guestClaims)
			.where(and(eq(guestClaims.tokenHash, hashClaimToken(token)), gt(guestClaims.expiresAt, now)))
			.limit(1)
			.for('update');

		if (!claim) {
			return null;
		}

		await tx.delete(guestClaims).where(eq(guestClaims.id, claim.id));

		const device = issueDeviceToken();
		const [identity] = await tx
			.update(guests)
			.set({ deviceTokenHash: device.tokenHash })
			.where(and(eq(guests.id, claim.guestId), isNull(guests.deviceTokenHash)))
			.returning({
				firstName: guests.firstName,
				lastName: guests.lastName,
				phone: guests.phone,
			});

		if (!identity) {
			return null;
		}

		const visit = await currentMarketVisitForGuest(claim.guestId, tx);

		if (!visit) {
			return { deviceToken: device.token, identity, visit: null };
		}

		const visitCredential = issueVisitToken();

		await tx
			.update(visits)
			.set({ accessTokenHash: visitCredential.tokenHash })
			.where(eq(visits.id, visit.id));

		return {
			deviceToken: device.token,
			identity,
			visit: { ...visit, visitToken: visitCredential.token },
		};
	});
}
