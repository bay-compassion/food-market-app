import { languages } from '../locales';
import type { AdminGuest } from './admin-api';
import type { DemoRoster } from './demo-preview';

export type DemoGuestColumn = 'ordinal' | 'name' | 'language' | 'status' | 'queue';
export type SortDirection = 'asc' | 'desc';

/** A fresh snapshot keeps live visit updates visible while preserving each guest's roster number. */
export class DemoGuestTableRows {
	private readonly collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

	constructor(
		private readonly roster: DemoRoster,
		private readonly currentVisits: AdminGuest[],
	) {}

	sorted(column: DemoGuestColumn, direction: SortDirection) {
		const rows = this.roster.guests.map((guest, index) => {
			const visit = this.currentVisits.find((entry) => entry.id === guest.visit?.id) ?? guest.visit;
			const language = languages.find((entry) => entry.code === guest.locale);

			return {
				guest,
				ordinal: index + 1,
				name: `${guest.firstName} ${guest.lastName}`,
				language: language ? `${language.label} (${guest.locale})` : guest.locale,
				status: visit ? visit.status.replaceAll('_', ' ') : 'No visit',
				queue: visit?.queuePosition ?? null,
			};
		});

		return rows.sort((left, right) => {
			const a = left[column];
			const b = right[column];

			// Missing queue positions stay last in either direction.
			if (a === null || b === null) {
				return a === b ? left.ordinal - right.ordinal : a === null ? 1 : -1;
			}

			const comparison =
				typeof a === 'number' && typeof b === 'number'
					? a - b
					: this.collator.compare(String(a), String(b));

			return comparison * (direction === 'asc' ? 1 : -1) || left.ordinal - right.ordinal;
		});
	}
}
