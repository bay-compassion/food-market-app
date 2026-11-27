import type { GuestDatabaseRow } from './guest-database-rows.ts';

/**
 * How the guest database's phone list is ordered: by name, as the desk's grid starts, or with the
 * most recent visit, the most visits, or the most notes first.
 */
export type GuestDatabaseOrderKey = 'name' | 'lastVisit' | 'visitCount' | 'noteCount';

/**
 * The order a worker chose to read the guest database's phone list in. The desk's grid sorts by
 * its own column headers instead, so this only orders the list a phone shows.
 *
 * Every order but name puts the largest or newest first, since that is what a worker sorting by it
 * is looking for, and breaks ties by name so guests with the same count keep a stable order.
 */
export class GuestDatabaseOrder {
	static readonly keys: readonly GuestDatabaseOrderKey[] = [
		'name',
		'lastVisit',
		'visitCount',
		'noteCount',
	];

	private static readonly collator = new Intl.Collator('en', { sensitivity: 'base' });

	constructor(readonly key: GuestDatabaseOrderKey = 'name') {}

	/** Whether this is the order the list starts in. */
	get isDefault(): boolean {
		return this.key === 'name';
	}

	/** `rows` in this order; never sorts in place. */
	apply(rows: readonly GuestDatabaseRow[]): GuestDatabaseRow[] {
		return [...rows].sort((a, b) => this.compare(a, b));
	}

	private compare(first: GuestDatabaseRow, second: GuestDatabaseRow): number {
		return (
			this.byKey(first, second) || GuestDatabaseOrder.collator.compare(first.name, second.name)
		);
	}

	private byKey(first: GuestDatabaseRow, second: GuestDatabaseRow): number {
		switch (this.key) {
			case 'name':
				return 0;
			case 'lastVisit':
				// A guest who has never visited goes after everyone who has.
				return (
					(second.lastVisit?.getTime() ?? -Infinity) - (first.lastVisit?.getTime() ?? -Infinity) ||
					0
				);
			case 'visitCount':
				return second.visitCount - first.visitCount;
			case 'noteCount':
				return second.noteCount - first.noteCount;
		}
	}
}
