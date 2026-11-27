import { describe, expect, it } from 'vitest';

import { GuestDatabaseOrder } from './guest-database-order';
import type { GuestDatabaseRow } from './guest-database-rows';

function row(name: string, overrides: Partial<GuestDatabaseRow> = {}): GuestDatabaseRow {
	return {
		name,
		lastVisit: null,
		visitCount: 0,
		noteCount: 0,
		...overrides,
	} as GuestDatabaseRow;
}

const names = (rows: GuestDatabaseRow[]) => rows.map((each) => each.name);

describe('GuestDatabaseOrder', () => {
	it('starts by name, ignoring case', () => {
		// Arrange
		const order = new GuestDatabaseOrder();

		// Act
		const sorted = order.apply([row('maria Santos'), row('Ana Reyes'), row('Linh Nguyen')]);

		// Assert
		expect(order.isDefault).toBe(true);
		expect(names(sorted)).toEqual(['Ana Reyes', 'Linh Nguyen', 'maria Santos']);
	});

	it('puts the most recent visit first and guests who never visited last', () => {
		// Arrange
		const order = new GuestDatabaseOrder('lastVisit');
		const rows = [
			row('Never Came'),
			row('Last Week', { lastVisit: new Date('2026-11-19T00:00:00Z') }),
			row('Today', { lastVisit: new Date('2026-11-26T00:00:00Z') }),
			row('Also Never'),
		];

		// Act
		const sorted = order.apply(rows);

		// Assert
		expect(order.isDefault).toBe(false);
		expect(names(sorted)).toEqual(['Today', 'Last Week', 'Also Never', 'Never Came']);
	});

	it('puts the most visits first, breaking ties by name', () => {
		// Arrange
		const order = new GuestDatabaseOrder('visitCount');
		const rows = [
			row('Bea', { visitCount: 2 }),
			row('Cal', { visitCount: 5 }),
			row('Abe', { visitCount: 2 }),
		];

		// Act
		const sorted = order.apply(rows);

		// Assert
		expect(names(sorted)).toEqual(['Cal', 'Abe', 'Bea']);
	});

	it('puts the most notes first', () => {
		// Arrange
		const order = new GuestDatabaseOrder('noteCount');

		// Act
		const sorted = order.apply([
			row('None'),
			row('Three', { noteCount: 3 }),
			row('One', { noteCount: 1 }),
		]);

		// Assert
		expect(names(sorted)).toEqual(['Three', 'One', 'None']);
	});

	it('leaves the rows it was given in their own order', () => {
		// Arrange
		const rows = [row('Bea'), row('Abe')];

		// Act
		new GuestDatabaseOrder().apply(rows);

		// Assert
		expect(names(rows)).toEqual(['Bea', 'Abe']);
	});
});
