import {
	and,
	count,
	countDistinct,
	eq,
	gt,
	gte,
	inArray,
	lte,
	ne,
	notExists,
	notInArray,
	or,
	asc,
	type SQL,
} from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';

import type { db as appDatabase } from '../../db/index.mjs';
import {
	guests,
	householdServiceEntries,
	lotteryOddsChanges,
	marketEvents,
	marketLocations,
	notificationDeliveries,
	pushSubscriptions,
	registrationQuestions,
	visitEvents,
	visits,
} from '../../db/schema.mjs';
import {
	periodComposition,
	periodLottery,
	periodReach,
	sessionFacts,
	snapshots,
} from '../../db/warehouse-schema.mjs';
import { MarketLocation, type LocalDate } from '../../src/models/market-location.js';
import {
	matchesSessionConfirmation,
	type SessionDataTable,
	type SessionDeletionPreview,
	type SessionOnlyGuest,
} from '../../src/services/session-deletion.js';

type Database = typeof appDatabase;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type Executor = Database | Transaction;

export type SessionDeletionResult =
	| {
			ok: true;
			rows: Record<SessionDataTable, number>;
			/** The warehouse snapshots a forced deletion removed: ids and kinds, nothing about a guest. */
			removedSnapshots: { id: string; kind: string }[];
	  }
	| { ok: false; status: 404 | 409; error: string };

/**
 * Permanently deleting one finished session and everything recorded in it, for a session that was
 * run as a test and must not reach the reports. Guests whose only visits were in it go with it;
 * a guest who also came to another session keeps their record and loses only this visit.
 *
 * Refused for a session that has not ended. Refused, too, for one the warehouse has already frozen
 * numbers for, unless forced: then every snapshot covering it — its own, and each month, quarter and
 * year it fell in — is deleted with it. That is the one deletion the warehouse ever sees. The daily
 * routine re-takes each of those periods that still has a session in it from the data as it then
 * stands, and a period whose only session was this one is no longer owed at all.
 */
export class SessionDeletion {
	constructor(
		private readonly database: Database,
		readonly marketEventId: string,
	) {}

	/** What a deletion would remove, or `null` when there is no such session. */
	async preview(): Promise<SessionDeletionPreview | null> {
		return (await this.previewWithin(this.database))?.preview ?? null;
	}

	/**
	 * Deletes the session, provided `typed` is its date and opening time and nothing blocks it —
	 * `force` lifting the warehouse's block, never the not-ended one. The session row is locked first,
	 * so no visit can be recorded against it between the check and the deletion.
	 *
	 * The warehouse's fact tables do not cascade from `snapshots`, so they go before it, and both go
	 * before the operational rows.
	 * Neither `visits` nor `household_service_entries` cascades from `market_events`, so those go
	 * first; deleting the visits cascades to their history, messages and push subscriptions. Then the
	 * session-only guests (cascading to their consent, opt-outs, claims and odds changes), and last
	 * the session itself, which cascades to its questions and session-scoped odds changes.
	 */
	async delete(typed: string, { force = false } = {}): Promise<SessionDeletionResult> {
		return this.database.transaction(async (tx) => {
			const found = await this.previewWithin(tx, { lock: true });

			if (!found) {
				return { ok: false, status: 404, error: 'Session not found. It may already be deleted.' };
			}

			const { preview, sessionDate } = found;

			if (!matchesSessionConfirmation(typed, preview.confirmation)) {
				return {
					ok: false,
					status: 409,
					error: 'That is not this session’s date and start time. Nothing was deleted.',
				};
			}

			if (preview.blockedBy === 'not-ended') {
				return {
					ok: false,
					status: 409,
					error: 'This session has not ended. End it before deleting it.',
				};
			}

			if (preview.blockedBy === 'warehoused' && !force) {
				return {
					ok: false,
					status: 409,
					error:
						'The warehouse has already recorded this session. Remove its snapshots too to delete it.',
				};
			}

			const snapshotIds = preview.coveringSnapshots.map(({ id }) => id);

			if (snapshotIds.length) {
				for (const facts of [sessionFacts, periodReach, periodComposition, periodLottery]) {
					await tx.delete(facts).where(inArray(facts.snapshotId, snapshotIds));
				}

				await tx.delete(snapshots).where(inArray(snapshots.id, snapshotIds));
			}

			const sessionOnlyIds = preview.sessionOnlyGuests.map(({ guestId }) => guestId);

			await tx
				.delete(householdServiceEntries)
				.where(eq(householdServiceEntries.marketEventId, this.marketEventId));
			const firstVisitGuests = await this.keptGuestsFirstSeenHere(tx, sessionOnlyIds);

			await tx.delete(visits).where(eq(visits.marketEventId, this.marketEventId));
			await this.restoreFirstVisits(tx, firstVisitGuests, sessionDate);

			if (sessionOnlyIds.length) {
				await tx.delete(guests).where(inArray(guests.id, sessionOnlyIds));
			}

			await tx.delete(marketEvents).where(eq(marketEvents.id, this.marketEventId));

			return {
				ok: true,
				rows: preview.rows,
				removedSnapshots: preview.coveringSnapshots.map(({ id, kind }) => ({ id, kind })),
			};
		});
	}

	/**
	 * Kept guests whose visit here was marked as their first. Their next visit was recorded as a
	 * return, so once this one is gone the earliest visit left has to carry the flag instead.
	 */
	private async keptGuestsFirstSeenHere(tx: Transaction, sessionOnlyIds: string[]) {
		const rows = await tx
			.selectDistinct({ guestId: visits.guestId })
			.from(visits)
			.where(
				and(
					eq(visits.marketEventId, this.marketEventId),
					eq(visits.isFirstVisit, true),
					sessionOnlyIds.length ? notInArray(visits.guestId, sessionOnlyIds) : undefined,
				),
			);

		return rows.map(({ guestId }) => guestId);
	}

	/**
	 * Flags each guest's earliest remaining visit as their first — but only one on or after the
	 * test session's date. A guest with an earlier visit already had their first, and rewriting a
	 * visit in an earlier, possibly reported period would change numbers already sent.
	 */
	private async restoreFirstVisits(tx: Transaction, guestIds: string[], sessionDate: LocalDate) {
		if (!guestIds.length) {
			return;
		}

		const earliest = tx
			.selectDistinctOn([visits.guestId], { id: visits.id, visitDate: visits.visitDate })
			.from(visits)
			.where(inArray(visits.guestId, guestIds))
			.orderBy(visits.guestId, visits.visitDate, visits.createdAt)
			.as('earliest');

		await tx
			.update(visits)
			.set({ isFirstVisit: true })
			.where(
				inArray(
					visits.id,
					tx.select({ id: earliest.id }).from(earliest).where(gte(earliest.visitDate, sessionDate)),
				),
			);
	}

	private async previewWithin(
		database: Executor,
		{ lock = false } = {},
	): Promise<{ preview: SessionDeletionPreview; sessionDate: LocalDate } | null> {
		const query = database
			.select({ event: marketEvents, location: marketLocations })
			.from(marketEvents)
			.innerJoin(marketLocations, eq(marketEvents.locationId, marketLocations.id))
			.where(eq(marketEvents.id, this.marketEventId))
			.limit(1);
		const [found] = await (lock ? query.for('update', { of: marketEvents }) : query);

		if (!found) {
			return null;
		}

		const { event } = found;
		const opensAt = event.registrationOpensAt;
		// A session snapshot's period starts at its opening; a month's or a year's contains it.
		const covering = await database
			.select({
				id: snapshots.id,
				kind: snapshots.kind,
				periodStart: snapshots.periodStart,
				periodEnd: snapshots.periodEnd,
				revision: snapshots.revision,
			})
			.from(snapshots)
			.where(and(lte(snapshots.periodStart, opensAt), gt(snapshots.periodEnd, opensAt)))
			.orderBy(asc(snapshots.periodStart), asc(snapshots.periodEnd), asc(snapshots.revision));
		const sessionOnlyGuests: SessionOnlyGuest[] = await database
			.select({ guestId: guests.id, firstName: guests.firstName, lastName: guests.lastName })
			.from(guests)
			.where(
				and(
					inArray(
						guests.id,
						database
							.select({ id: visits.guestId })
							.from(visits)
							.where(eq(visits.marketEventId, this.marketEventId)),
					),
					notExists(
						database
							.select({ id: visits.id })
							.from(visits)
							.where(
								and(eq(visits.guestId, guests.id), ne(visits.marketEventId, this.marketEventId)),
							),
					),
				),
			)
			.orderBy(guests.lastName, guests.firstName);
		const sessionOnlyIds = sessionOnlyGuests.map(({ guestId }) => guestId);
		const [guestTotal] = await database
			.select({ value: countDistinct(visits.guestId) })
			.from(visits)
			.where(eq(visits.marketEventId, this.marketEventId));
		const visitIds = database
			.select({ id: visits.id })
			.from(visits)
			.where(eq(visits.marketEventId, this.marketEventId));
		const tally = async (table: PgTable, where: SQL | undefined) =>
			(await database.select({ value: count() }).from(table).where(where))[0]?.value ?? 0;
		const rows: Record<SessionDataTable, number> = {
			household_service_entries: await tally(
				householdServiceEntries,
				eq(householdServiceEntries.marketEventId, this.marketEventId),
			),
			visits: await tally(visits, eq(visits.marketEventId, this.marketEventId)),
			visit_events: await tally(visitEvents, inArray(visitEvents.visitId, visitIds)),
			notification_deliveries: await tally(
				notificationDeliveries,
				inArray(notificationDeliveries.visitId, visitIds),
			),
			push_subscriptions: await tally(
				pushSubscriptions,
				inArray(pushSubscriptions.visitId, visitIds),
			),
			guests: sessionOnlyGuests.length,
			registration_questions: await tally(
				registrationQuestions,
				eq(registrationQuestions.marketEventId, this.marketEventId),
			),
			lottery_odds_changes: await tally(
				lotteryOddsChanges,
				sessionOnlyIds.length
					? or(
							eq(lotteryOddsChanges.marketEventId, this.marketEventId),
							inArray(lotteryOddsChanges.guestId, sessionOnlyIds),
						)
					: eq(lotteryOddsChanges.marketEventId, this.marketEventId),
			),
		};

		const market = new MarketLocation(found.location);
		const sessionDate = market.localDateOf(opensAt);

		return {
			sessionDate,
			preview: {
				marketEventId: event.id,
				registrationOpensAt: opensAt.toISOString(),
				registrationClosesAt: event.registrationClosesAt.toISOString(),
				confirmation: `${sessionDate} ${market.formatWallClock(opensAt)}`,
				blockedBy: event.status !== 'ended' ? 'not-ended' : covering.length ? 'warehoused' : null,
				coveringSnapshots: covering.map((snapshot) => ({
					...snapshot,
					periodStart: snapshot.periodStart.toISOString(),
					periodEnd: snapshot.periodEnd.toISOString(),
				})),
				sessionOnlyGuests,
				keptGuests: (guestTotal?.value ?? 0) - sessionOnlyGuests.length,
				rows,
			},
		};
	}
}
