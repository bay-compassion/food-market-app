import { count, eq, inArray, max } from 'drizzle-orm';

import type { db as appDatabase } from '../../db/index.mjs';
import { guests, visits } from '../../db/schema.mjs';
import type { RelatedGuestRecord } from '../../src/models/guest-profile.js';
import { GuestReconciliation } from '../../src/models/guest-reconciliation.js';
import { readGuestIdentities } from './draw-ledger.mjs';

/**
 * The other guest records linked to one guest: likely the same person (same household and same
 * name), or someone else in their household (a phone number in common, transitively). One person
 * routinely holds several records — a visit a worker adds always creates one — so the profile
 * shows them side by side. Read-only: merging records is not offered.
 */
export class GuestRelatedRecords {
	constructor(private readonly db: typeof appDatabase) {}

	/** The records linked to the guest, the same person first; `null` when there is no such guest. */
	async read(guestId: string): Promise<RelatedGuestRecord[] | null> {
		const identities = await readGuestIdentities(this.db);

		if (!identities.some((identity) => identity.guestId === guestId)) {
			return null;
		}

		const reconciliation = new GuestReconciliation(identities);
		const household = reconciliation.householdOf(guestId);
		const person = reconciliation.personOf(guestId);
		const linked = identities
			.map(({ guestId: id }) => id)
			.filter((id) => id !== guestId && reconciliation.householdOf(id) === household);

		if (linked.length === 0) {
			return [];
		}

		const rows = await this.db
			.select({
				guestId: guests.id,
				firstName: guests.firstName,
				lastName: guests.lastName,
				phone: guests.phone,
				createdAt: guests.createdAt,
				visitCount: count(visits.id),
				lastVisitDate: max(visits.visitDate),
			})
			.from(guests)
			.leftJoin(visits, eq(visits.guestId, guests.id))
			.where(inArray(guests.id, linked))
			.groupBy(guests.id);

		return rows
			.map((row) => ({
				...row,
				createdAt: row.createdAt.toISOString(),
				lastVisitDate: row.lastVisitDate ?? null,
				relation:
					reconciliation.personOf(row.guestId) === person
						? ('same-person' as const)
						: ('household' as const),
			}))
			.sort(
				(a, b) =>
					Number(b.relation === 'same-person') - Number(a.relation === 'same-person') ||
					b.createdAt.localeCompare(a.createdAt),
			);
	}
}
