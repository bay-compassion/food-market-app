import { languages, type Locale } from '../locales.ts';
import type { DatabaseGuest } from '../services/admin-api.ts';
import type { GuestDatabaseFilter } from '../services/guest-database-filters.ts';
import { visitStatuses, type VisitStatus } from '../services/visitStateMachine.ts';

/** One guest as the guest database grid renders, sorts, and filters them. */
export type GuestDatabaseRow = {
	id: string;
	guest: DatabaseGuest;
	name: string;
	phone: string;
	/** `null` for a guest with no visit, whose household is only ever recorded on one. */
	householdSize: number | null;
	language: string;
	status: VisitStatus | null;
	statusLabel: string;
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
 * A guest who has never had a visit still gets a row, keyed by their guest id and labelled with
 * `noVisitLabel`, so a worker can find someone they added between sessions.
 */
export class GuestDatabaseRows {
	constructor(
		private readonly guests: DatabaseGuest[],
		private readonly statusLabels: Record<VisitStatus, string>,
		private readonly noVisitLabel: string,
	) {}

	get rows(): GuestDatabaseRow[] {
		return this.guests.map((guest) => ({
			id: guest.status === null ? guest.guestId : guest.id,
			guest,
			name: `${guest.firstName} ${guest.lastName}`.trim(),
			phone: guest.phone,
			householdSize: guest.householdSize,
			language: languageLabel(guest.locale),
			status: guest.status,
			statusLabel: guest.status === null ? this.noVisitLabel : this.statusLabels[guest.status],
		}));
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
				return row.status !== null;
			case 'not-placed':
				return row.status === 'not_placed';
		}
	}

	get statusOptions(): string[] {
		return [...visitStatuses.map((status) => this.statusLabels[status]), this.noVisitLabel];
	}

	get languageOptions(): string[] {
		return languages.map((language) => language.englishLabel);
	}
}
