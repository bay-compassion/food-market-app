import { and, count, eq, inArray, ne, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';

import type { db as appDatabase } from '../../db/index.mjs';
import {
	guestClaims,
	guests,
	marketEvents,
	notificationDeliveries,
	pushSubscriptions,
	smsOptOuts,
	smsSubscriptions,
	visitEvents,
	visits,
} from '../../db/schema.mjs';
import type { GuestDataTable, GuestDeletionPreview } from '../../src/services/guest-deletion.js';
import { isSamePhone, normalizePhone } from '../../src/services/phoneFormat.js';

/**
 * The database to act on. Passed in rather than imported, because `scripts/delete-guest.mts`
 * points `db/index.mts` at a database before importing it — a top-level import here would run first.
 */
type Database = typeof appDatabase;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export type GuestDeletionResult = { ok: true } | { ok: false; status: 404 | 409; error: string };

/**
 * Permanently deleting one guest and everything stored about them, for a guest who asks. Used by
 * the dashboard's delete dialog through `DELETE /api/admin/guests/:guestId` and by
 * `scripts/delete-guest.mts`, so the two cannot disagree about what a deletion removes.
 */
export class GuestDeletion {
	constructor(
		private readonly database: Database,
		readonly guestId: string,
	) {}

	/** Every guest with this phone number. A household can share one, so there may be several. */
	static async findByPhone(database: Database, phone: string) {
		return database
			.select({
				id: guests.id,
				firstName: guests.firstName,
				lastName: guests.lastName,
				createdAt: guests.createdAt,
			})
			.from(guests)
			.where(eq(guests.normalizedPhone, normalizePhone(phone)))
			.orderBy(guests.createdAt);
	}

	/** What a deletion would remove, or `null` when there is no such guest. */
	async preview(): Promise<GuestDeletionPreview | null> {
		return this.previewWithin(this.database);
	}

	/**
	 * Deletes the guest, provided `typedPhone` is their phone number and they are in no open session.
	 * The check and the deletion share one transaction, so neither can change between them.
	 *
	 * `visits` is the only table that does not cascade from `guests`, so its rows go first; that
	 * cascades to each visit's events, notifications and push subscription, and deleting the guest
	 * then cascades to their text consent, opt-outs and phone-transfer codes.
	 */
	async delete(typedPhone: string): Promise<GuestDeletionResult> {
		return this.database.transaction(async (tx) => {
			const preview = await this.previewWithin(tx);

			if (!preview) {
				return { ok: false, status: 404, error: 'Guest not found. They may already be deleted.' };
			}

			if (!isSamePhone(typedPhone, preview.phone)) {
				return {
					ok: false,
					status: 409,
					error: 'That is not this guest’s phone number. Nothing was deleted.',
				};
			}

			if (preview.inOpenSession) {
				return {
					ok: false,
					status: 409,
					error: 'This guest is in a session that has not ended. Delete them once it ends.',
				};
			}

			await tx.delete(visits).where(eq(visits.guestId, this.guestId));
			await tx.delete(guests).where(eq(guests.id, this.guestId));

			return { ok: true };
		});
	}

	private async previewWithin(
		database: Database | Transaction,
	): Promise<GuestDeletionPreview | null> {
		const [guest] = await database
			.select({
				firstName: guests.firstName,
				lastName: guests.lastName,
				phone: guests.phone,
				createdAt: guests.createdAt,
			})
			.from(guests)
			.where(eq(guests.id, this.guestId));

		if (!guest) {
			return null;
		}

		const visitIds = database
			.select({ id: visits.id })
			.from(visits)
			.where(eq(visits.guestId, this.guestId));
		const tally = async (table: PgTable, where: SQL | undefined) =>
			(await database.select({ value: count() }).from(table).where(where))[0]?.value ?? 0;
		const rows: Record<GuestDataTable, number> = {
			visits: await tally(visits, eq(visits.guestId, this.guestId)),
			visit_events: await tally(visitEvents, inArray(visitEvents.visitId, visitIds)),
			notification_deliveries: await tally(
				notificationDeliveries,
				inArray(notificationDeliveries.visitId, visitIds),
			),
			push_subscriptions: await tally(
				pushSubscriptions,
				inArray(pushSubscriptions.visitId, visitIds),
			),
			sms_subscriptions: await tally(smsSubscriptions, eq(smsSubscriptions.guestId, this.guestId)),
			sms_opt_outs: await tally(smsOptOuts, eq(smsOptOuts.guestId, this.guestId)),
			guest_claims: await tally(guestClaims, eq(guestClaims.guestId, this.guestId)),
		};
		const [openVisit] = await database
			.select({ id: visits.id })
			.from(visits)
			.innerJoin(marketEvents, eq(visits.marketEventId, marketEvents.id))
			.where(and(eq(visits.guestId, this.guestId), ne(marketEvents.status, 'ended')))
			.limit(1);

		return {
			guestId: this.guestId,
			firstName: guest.firstName,
			lastName: guest.lastName,
			phone: guest.phone,
			signedUpAt: guest.createdAt.toISOString(),
			inOpenSession: openVisit !== undefined,
			rows,
		};
	}
}
