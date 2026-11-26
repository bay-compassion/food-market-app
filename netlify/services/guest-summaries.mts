import { desc, eq, ilike, or, sql } from 'drizzle-orm';

import type { db as appDatabase } from '../../db/index.mjs';
import { guestNoteCategories, guestNotes, guests, visits } from '../../db/schema.mjs';
import type { GuestSummary } from '../../src/services/admin-api.js';

/**
 * Every guest on record, one row each, as the guest database lists them.
 *
 * A row is the guest, the visit they had most recently (whose status the row shows and whose
 * commands its menu runs), and totals across every visit and note. Before this, the list was one
 * row per visit, so a guest who came seven times was listed seven times.
 *
 * Race and ethnicity are never read here: they leave the guest table only as aggregate counts.
 */
export class GuestSummaries {
	/**
	 * A guard against an unbounded read, set far above the number of guests the market serves. The
	 * screen sorts and filters the whole list in the browser, so it needs all of it at once.
	 */
	static readonly limit = 10_000;

	constructor(private readonly db: typeof appDatabase) {}

	async list(search = ''): Promise<GuestSummary[]> {
		const query = search.trim();
		const latest = this.latestVisits();
		const visitTotals = this.visitTotals();
		const noteTotals = this.noteTotals();
		const rows = await this.db
			.select({
				id: latest.id,
				guestId: guests.id,
				marketEventId: latest.marketEventId,
				firstName: guests.firstName,
				lastName: guests.lastName,
				pronunciation: guests.pronunciation,
				householdSize: latest.householdSize,
				phone: guests.phone,
				locale: guests.locale,
				status: latest.status,
				track: latest.track,
				queuePosition: latest.queuePosition,
				priorityNumber: latest.priorityNumber,
				queueFront: latest.queueFront,
				queueOrder: latest.queueOrder,
				calledAt: latest.calledAt,
				visitCount: visitTotals.visitCount,
				servedCount: visitTotals.servedCount,
				noShowCount: visitTotals.noShowCount,
				lastVisitDate: visitTotals.lastVisitDate,
				noteCount: noteTotals.noteCount,
				latestNoteCategory: noteTotals.latestNoteCategory,
			})
			.from(guests)
			.leftJoin(latest, eq(latest.guestId, guests.id))
			.leftJoin(visitTotals, eq(visitTotals.guestId, guests.id))
			.leftJoin(noteTotals, eq(noteTotals.guestId, guests.id))
			.where(
				query
					? or(
							ilike(guests.firstName, `%${query}%`),
							ilike(guests.lastName, `%${query}%`),
							ilike(guests.phone, `%${query}%`),
						)
					: undefined,
			)
			.orderBy(desc(sql`coalesce(${latest.createdAt}, ${guests.createdAt})`))
			.limit(GuestSummaries.limit);

		return rows.map((row) => ({
			...row,
			calledAt: row.calledAt?.toISOString() ?? null,
			visitCount: row.visitCount ?? 0,
			servedCount: row.servedCount ?? 0,
			noShowCount: row.noShowCount ?? 0,
			lastVisitDate: row.lastVisitDate ?? null,
			noteCount: row.noteCount ?? 0,
			latestNoteCategory: row.latestNoteCategory ?? null,
		})) as GuestSummary[];
	}

	/** Each guest's most recent visit. */
	private latestVisits() {
		return this.db
			.selectDistinctOn([visits.guestId], {
				id: visits.id,
				guestId: visits.guestId,
				marketEventId: visits.marketEventId,
				householdSize: visits.householdSize,
				status: visits.status,
				track: visits.track,
				queuePosition: visits.queuePosition,
				priorityNumber: visits.priorityNumber,
				queueFront: visits.queueFront,
				queueOrder: visits.queueOrder,
				calledAt: visits.calledAt,
				createdAt: visits.createdAt,
			})
			.from(visits)
			.orderBy(visits.guestId, desc(visits.createdAt))
			.as('latest_visit');
	}

	private visitTotals() {
		return this.db
			.select({
				guestId: visits.guestId,
				visitCount: sql<number>`count(*)::int`.as('visit_count'),
				servedCount: sql<number>`(count(*) filter (where ${visits.status} = 'served'))::int`.as(
					'served_count',
				),
				noShowCount: sql<number>`(count(*) filter (where ${visits.status} = 'no_show'))::int`.as(
					'no_show_count',
				),
				lastVisitDate: sql<string>`max(${visits.visitDate})::text`.as('last_visit_date'),
			})
			.from(visits)
			.groupBy(visits.guestId)
			.as('visit_totals');
	}

	/** How many notes a guest has, and the category of the newest one (null when it has none). */
	private noteTotals() {
		return this.db
			.select({
				guestId: guestNotes.guestId,
				noteCount: sql<number>`count(*)::int`.as('note_count'),
				latestNoteCategory: sql<
					string | null
				>`(array_agg(${guestNoteCategories.label} order by ${guestNotes.createdAt} desc))[1]`.as(
					'latest_note_category',
				),
			})
			.from(guestNotes)
			.leftJoin(guestNoteCategories, eq(guestNoteCategories.id, guestNotes.categoryId))
			.groupBy(guestNotes.guestId)
			.as('note_totals');
	}
}
