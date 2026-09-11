import { and, eq, gt, isNull } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { guestClaims, guests, pushSubscriptions, visits } from '../../db/schema.mjs';
import type { VisitStatus } from '../../src/services/visitStateMachine.js';
import { getLogger } from '../lib/logging.mjs';
import { currentMarketVisitForGuest } from './current-visit.mjs';
import {
	hashClaimToken,
	issueClaimToken,
	issueDeviceToken,
	issueVisitToken,
} from './guestCredentials.mjs';

/** Long enough for a guest to find their phone at the table; short enough that a photo goes stale. */
export const guestClaimLifetimeMs = 15 * 60_000;

/**
 * How long after adding a guest a worker may still put them on a phone without a manager. Covers
 * the walk-in standing at the table; not a record from last week looked up by its id.
 */
export const workerClaimWindowMs = 15 * 60_000;

/**
 * Who is asking. A `worker` may only hand over a guest no phone holds, and only one added moments
 * ago. A `manager` (`manage:guest-access`) may hand over any guest — including one on another
 * phone, which loses the record once the code is scanned.
 */
export type ClaimAuthority = 'worker' | 'manager';

export type IssueGuestClaimResult =
	| { ok: true; body: { token: string; expiresAt: string; replacesDevice: boolean } }
	| { ok: false; status: 403 | 404 | 409; error: string };

export type RedeemedGuestClaim = {
	deviceToken: string;
	identity: { firstName: string; lastName: string; phone: string };
	visit: { id: string; marketEventId: string; status: VisitStatus; visitToken: string } | null;
};

/**
 * Issues the code a worker shows as a QR code, replacing any earlier code for the same guest.
 *
 * The code records which device credential it may replace — none, or the guest's current one for
 * a manager's override — and redeeming it only succeeds while that is still true. Nothing changes
 * for the guest's current phone until the code is scanned, so issuing one and walking away is safe.
 */
export async function issueGuestClaim(
	guestId: string,
	issuer: { authority: ClaimAuthority; actor?: string },
	now = new Date(),
): Promise<IssueGuestClaimResult> {
	const [guest] = await db
		.select({ deviceTokenHash: guests.deviceTokenHash, createdAt: guests.createdAt })
		.from(guests)
		.where(eq(guests.id, guestId))
		.limit(1);

	if (!guest) {
		return { ok: false, status: 404, error: 'That guest could not be found.' };
	}

	if (issuer.authority === 'worker') {
		if (guest.deviceTokenHash !== null) {
			return { ok: false, status: 409, error: "This guest's record is already on a phone." };
		}

		if (now.valueOf() - guest.createdAt.valueOf() > workerClaimWindowMs) {
			return {
				ok: false,
				status: 403,
				error: 'Only a manager can set up a phone for a guest who was not just added.',
			};
		}
	}

	const { token, tokenHash } = issueClaimToken();
	const expiresAt = new Date(now.valueOf() + guestClaimLifetimeMs);
	const code = {
		tokenHash,
		replacesDeviceTokenHash: guest.deviceTokenHash,
		expiresAt,
		createdAt: now,
	};

	await db
		.insert(guestClaims)
		.values({ guestId, ...code })
		.onConflictDoUpdate({ target: guestClaims.guestId, set: code });

	const replacesDevice = guest.deviceTokenHash !== null;

	// Who handed which record to a phone, and whether it took one away from another phone. No
	// guest details: the id is enough to look the rest up.
	getLogger().info({
		message: 'guest_claim.issued',
		guestId,
		actor: issuer.actor,
		authority: issuer.authority,
		replacesDevice,
	});

	return { ok: true, body: { token, expiresAt: expiresAt.toISOString(), replacesDevice } };
}

/**
 * Hands the claimed guest to the phone presenting `token`: a new device credential, a new credential
 * for their current visit, and the identity the phone keeps locally. Resolves to `null` for a code
 * that is unknown, expired, used, or overtaken — deliberately indistinguishable to the caller.
 *
 * Whatever held the record before loses it here: the old device credential stops matching, the
 * visit's old credential is replaced, and any push subscription tied to that visit is dropped so
 * the old phone stops hearing about it.
 */
export async function redeemGuestClaim(
	token: string,
	now = new Date(),
): Promise<RedeemedGuestClaim | null> {
	return db.transaction(async (tx) => {
		const [claim] = await tx
			.select({
				id: guestClaims.id,
				guestId: guestClaims.guestId,
				replacesDeviceTokenHash: guestClaims.replacesDeviceTokenHash,
			})
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
			.where(
				and(
					eq(guests.id, claim.guestId),
					// Only while the guest still holds exactly what the code was issued against.
					claim.replacesDeviceTokenHash === null
						? isNull(guests.deviceTokenHash)
						: eq(guests.deviceTokenHash, claim.replacesDeviceTokenHash),
				),
			)
			.returning({
				firstName: guests.firstName,
				lastName: guests.lastName,
				phone: guests.phone,
			});

		if (!identity) {
			return null;
		}

		getLogger().info({
			message: 'guest_claim.redeemed',
			guestId: claim.guestId,
			replacedDevice: claim.replacesDeviceTokenHash !== null,
		});

		const visit = await currentMarketVisitForGuest(claim.guestId, tx);

		if (!visit) {
			return { deviceToken: device.token, identity, visit: null };
		}

		const visitCredential = issueVisitToken();

		await tx
			.update(visits)
			.set({ accessTokenHash: visitCredential.tokenHash })
			.where(eq(visits.id, visit.id));
		await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.visitId, visit.id));

		return {
			deviceToken: device.token,
			identity,
			visit: { ...visit, visitToken: visitCredential.token },
		};
	});
}
