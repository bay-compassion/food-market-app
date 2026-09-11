import { languages, type Locale } from '../locales.ts';
import type { DatabaseGuest } from './admin-api.ts';
import { visitStatuses, type VisitStatus } from './visitStateMachine.ts';

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

	get statusOptions(): string[] {
		return [...visitStatuses.map((status) => this.statusLabels[status]), this.noVisitLabel];
	}

	get languageOptions(): string[] {
		return languages.map((language) => language.englishLabel);
	}
}
