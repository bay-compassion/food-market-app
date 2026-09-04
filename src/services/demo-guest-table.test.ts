import { describe, expect, it } from 'vitest';

import { DemoGuestTableRows } from './demo-guest-table';
import type { DemoGuest } from './demo-preview';

const guest: DemoGuest = {
	id: 'one',
	firstName: 'Zoe',
	lastName: 'Example',
	phone: '5550100',
	locale: 'es',
	deviceToken: 'demo',
	household: null,
	visit: { id: 'visit-one', token: 'demo', status: 'waiting', queuePosition: 10 },
};
const roster = {
	marketEventId: 'demo',
	guests: [
		guest,
		{
			...guest,
			id: 'two',
			firstName: 'Ada',
			locale: 'en',
			visit: { ...guest.visit!, id: 'visit-two', queuePosition: 2 },
		},
		{ ...guest, id: 'three', firstName: 'Ada', locale: 'en', visit: null },
	],
};

describe('demo guest table sorting', () => {
	it('sorts numeric queue positions with missing values last in both directions', () => {
		// Arrange
		const table = new DemoGuestTableRows(roster, []);
		// Act
		const ascending = table.sorted('queue', 'asc');
		const descending = table.sorted('queue', 'desc');

		// Assert
		expect(ascending.map((row) => row.ordinal)).toEqual([2, 1, 3]);
		expect(descending.map((row) => row.ordinal)).toEqual([1, 2, 3]);
	});

	it('sorts displayed text stably without renumbering guests or mutating the roster', () => {
		// Arrange
		const table = new DemoGuestTableRows(roster, []);
		// Act
		const byName = table.sorted('name', 'asc');
		const byLanguage = table.sorted('language', 'asc');
		const byStatus = table.sorted('status', 'asc');

		// Assert
		expect(byName.map((row) => row.ordinal)).toEqual([2, 3, 1]);
		expect(byLanguage.map((row) => row.ordinal)).toEqual([2, 3, 1]);
		expect(byStatus[0]?.ordinal).toBe(3);
		expect(roster.guests.map((row) => row.id)).toEqual(['one', 'two', 'three']);
	});
});
