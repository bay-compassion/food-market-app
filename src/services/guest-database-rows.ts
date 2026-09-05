import { languages, type Locale } from '../locales.ts';
import type { QueueGuest } from './admin-api.ts';
import { visitStatuses, type VisitStatus } from './visitStateMachine.ts';

/** One guest as the guest database grid renders, sorts, and filters them. */
export type GuestDatabaseRow = {
	id: string;
	guest: QueueGuest;
	name: string;
	phone: string;
	householdSize: number;
	language: string;
	status: VisitStatus;
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
 */
export class GuestDatabaseRows {
	constructor(
		private readonly guests: QueueGuest[],
		private readonly statusLabels: Record<VisitStatus, string>,
	) {}

	get rows(): GuestDatabaseRow[] {
		return this.guests.map((guest) => ({
			id: guest.id,
			guest,
			name: `${guest.firstName} ${guest.lastName}`.trim(),
			phone: guest.phone,
			householdSize: guest.householdSize,
			language: languageLabel(guest.locale),
			status: guest.status,
			statusLabel: this.statusLabels[guest.status],
		}));
	}

	get statusOptions(): string[] {
		return visitStatuses.map((status) => this.statusLabels[status]);
	}

	get languageOptions(): string[] {
		return languages.map((language) => language.englishLabel);
	}
}
