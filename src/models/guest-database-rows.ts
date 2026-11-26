import { languages, type Locale } from '../locales.ts';
import type { GuestSummary } from '../services/admin-api.ts';
import type { GuestDatabaseFilter } from '../services/guest-database-filters.ts';
import { visitStatuses, type VisitStatus } from '../services/visitStateMachine.ts';

/** One guest as the guest database grid renders, sorts, and filters them. */
export type GuestDatabaseRow = {
	/** The guest's id: one row per guest, whatever their visits. */
	id: string;
	guest: GuestSummary;
	name: string;
	phone: string;
	/** As of the latest visit; `null` for a guest with none, since only a visit records it. */
	householdSize: number | null;
	language: string;
	/** The latest visit's status. */
	status: VisitStatus | null;
	statusLabel: string;
	/** Whether the latest visit is in the session that is open now. */
	inSession: boolean;
	/** The latest visit's date, for sorting; `null` for a guest with none. */
	lastVisit: Date | null;
	/** The latest visit's date as a worker reads it, or `noVisitLabel`. */
	lastVisitLabel: string;
	visitCount: number;
	noteCount: number;
	/** The newest note's category, which the list shows as the row's flag. */
	latestNoteCategory: string | null;
};

/** The English name of a language, which is what the admin screens read. */
export function languageLabel(locale: Locale): string {
	return languages.find((language) => language.code === locale)?.englishLabel ?? locale;
}

/**
 * The guest database's rows and the values its columns can be filtered by.
 *
 * Every derived label is materialised onto the row rather than computed while a cell renders: the
 * grid sorts and filters on the row's own values, so a status or language that only exists inside
 * a `renderCell` is a column a worker cannot sort or filter by.
 *
 * The filter options come from the domain rather than from the rows on screen, so the status
 * dropdown offers every status a visit can hold — including the ones nobody is in today.
 *
 * A guest who has never had a visit still gets a row, labelled with `noVisitLabel`, so a worker can
 * find someone they added between sessions.
 */
export class GuestDatabaseRows {
	constructor(
		private readonly guests: GuestSummary[],
		private readonly statusLabels: Record<VisitStatus, string>,
		private readonly noVisitLabel: string,
		/** The session open now, which "In Today's Session" means; `null` between sessions. */
		private readonly currentEventId: string | null = null,
		private readonly today: Date = new Date(),
	) {}

	get rows(): GuestDatabaseRow[] {
		return this.guests.map((guest) => {
			const lastVisit = guest.lastVisitDate ? new Date(`${guest.lastVisitDate}T00:00:00Z`) : null;

			return {
				id: guest.guestId,
				guest,
				name: `${guest.firstName} ${guest.lastName}`.trim(),
				phone: guest.phone,
				householdSize: guest.householdSize,
				language: languageLabel(guest.locale),
				status: guest.status,
				statusLabel: guest.status === null ? this.noVisitLabel : this.statusLabels[guest.status],
				inSession: this.currentEventId !== null && guest.marketEventId === this.currentEventId,
				lastVisit,
				lastVisitLabel: lastVisit ? this.dateLabel(lastVisit) : this.noVisitLabel,
				visitCount: guest.visitCount,
				noteCount: guest.noteCount,
				latestNoteCategory: guest.latestNoteCategory,
			};
		});
	}

	/**
	 * The rows a quick filter and a search leave on screen. The search matches a name by its
	 * letters, ignoring case, and a phone number by its digits, so "5550125" finds
	 * "(510) 555-0125".
	 */
	matching(filter: GuestDatabaseFilter, search: string): GuestDatabaseRow[] {
		const words = search.trim().toLocaleLowerCase();
		const digits = search.replace(/\D/g, '');

		return this.rows.filter(
			(row) =>
				GuestDatabaseRows.passes(row, filter) &&
				(!words ||
					row.name.toLocaleLowerCase().includes(words) ||
					(digits.length > 0 && row.phone.replace(/\D/g, '').includes(digits))),
		);
	}

	private static passes(row: GuestDatabaseRow, filter: GuestDatabaseFilter): boolean {
		switch (filter) {
			case 'all':
				return true;
			case 'in-session':
				return row.inSession;
			case 'not-placed':
				return row.inSession && row.status === 'not_placed';
			case 'has-notes':
				return row.noteCount > 0;
		}
	}

	get statusOptions(): string[] {
		return [...visitStatuses.map((status) => this.statusLabels[status]), this.noVisitLabel];
	}

	get languageOptions(): string[] {
		return languages.map((language) => language.englishLabel);
	}

	/** "Nov 19", with the year only when it is not this one. Visit dates are calendar dates. */
	private dateLabel(date: Date): string {
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: date.getUTCFullYear() === this.today.getFullYear() ? undefined : 'numeric',
			timeZone: 'UTC',
		});
	}
}
