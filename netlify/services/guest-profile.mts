import { desc, eq } from 'drizzle-orm';

import type { db as appDatabase } from '../../db/index.mjs';
import { guests, visits } from '../../db/schema.mjs';
import type { GuestProfileRecord } from '../../src/models/guest-profile.js';

/**
 * Reads one guest's record for their profile: who they are and every visit, newest first.
 * Race and ethnicity are never selected: they leave the guest table only as aggregate counts.
 */
export class GuestProfileReader {
	constructor(private readonly db: typeof appDatabase) {}

	/** The guest's record, or `null` when there is no such guest. */
	async read(guestId: string): Promise<GuestProfileRecord | null> {
		const [guest] = await this.db
			.select({
				guestId: guests.id,
				firstName: guests.firstName,
				lastName: guests.lastName,
				pronunciation: guests.pronunciation,
				phone: guests.phone,
				locale: guests.locale,
				createdAt: guests.createdAt,
			})
			.from(guests)
			.where(eq(guests.id, guestId))
			.limit(1);

		if (!guest) {
			return null;
		}

		const rows = await this.db
			.select({
				id: visits.id,
				marketEventId: visits.marketEventId,
				visitDate: visits.visitDate,
				status: visits.status,
				track: visits.track,
				queuePosition: visits.queuePosition,
				priorityNumber: visits.priorityNumber,
				queueFront: visits.queueFront,
				queueOrder: visits.queueOrder,
				householdSize: visits.householdSize,
				childrenCount: visits.childrenCount,
				seniorsCount: visits.seniorsCount,
				ageRange: visits.ageRange,
				source: visits.source,
				calledAt: visits.calledAt,
				servedAt: visits.servedAt,
				createdAt: visits.createdAt,
			})
			.from(visits)
			.where(eq(visits.guestId, guestId))
			.orderBy(desc(visits.createdAt));

		return {
			...guest,
			locale: guest.locale as GuestProfileRecord['locale'],
			createdAt: guest.createdAt.toISOString(),
			visits: rows.map((visit) => ({
				...visit,
				calledAt: visit.calledAt?.toISOString() ?? null,
				servedAt: visit.servedAt?.toISOString() ?? null,
				createdAt: visit.createdAt.toISOString(),
			})),
		};
	}
}
