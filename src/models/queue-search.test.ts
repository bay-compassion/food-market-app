import { describe, expect, it } from 'vitest';

import { QueueSearch, type QueueSearchable } from './queue-search';

function ticket(overrides: Partial<QueueSearchable> = {}): QueueSearchable {
	return {
		id: 'visit-0000-7f3a',
		firstName: 'Tomás',
		lastName: 'Rivera',
		phone: '5105550123',
		queuePosition: 4,
		priorityNumber: null,
		...overrides,
	};
}

describe('QueueSearch', () => {
	it('finds every ticket while the query is blank', () => {
		// Arrange
		const search = new QueueSearch('   ');

		// Act
		const found = search.matches(ticket());

		// Assert
		expect(search.isActive).toBe(false);
		expect(found).toBe(true);
	});

	it('finds a name regardless of case and accents', () => {
		// Arrange
		const searches = ['tomas', 'TOMÁS', 'riv'].map((query) => new QueueSearch(query));

		// Act
		const found = searches.map((search) => search.matches(ticket()));

		// Assert
		expect(found).toEqual([true, true, true]);
	});

	it('needs every word to match', () => {
		// Arrange
		const search = new QueueSearch('tomas santos');

		// Act
		const found = search.matches(ticket());

		// Assert
		expect(found).toBe(false);
	});

	it('finds a queue number exactly rather than every number containing it', () => {
		// Arrange
		const search = new QueueSearch('4');

		// Act
		const found = [4, 14, 40].map((queuePosition) =>
			search.matches(ticket({ queuePosition, id: 'visit-abcd' })),
		);

		// Assert
		expect(found).toEqual([true, false, false]);
	});

	it('finds a priority number with or without its capital', () => {
		// Arrange
		const priority = ticket({ queuePosition: null, priorityNumber: 2 });

		// Act
		const found = ['P2', 'p2', '2'].map((query) => new QueueSearch(query).matches(priority));

		// Assert
		expect(found).toEqual([true, true, false]);
	});

	it('finds the reference code a name tag carries', () => {
		// Arrange
		const searches = ['7f3a', 'F3', '7f'].map((query) => new QueueSearch(query));

		// Act
		const found = searches.map((search) => search.matches(ticket()));

		// Assert
		expect(found).toEqual([true, true, true]);
	});

	it('finds a phone number from its last digits, however it is written', () => {
		// Arrange
		const searches = ['0123', '555-0123', '(510) 555-0123'].map((query) => new QueueSearch(query));

		// Act
		const found = searches.map((search) => search.matches(ticket()));

		// Assert
		expect(found).toEqual([true, true, true]);
	});

	it('reads three digits or fewer as a queue number, not part of a phone number', () => {
		// Arrange
		const search = new QueueSearch('123');

		// Act
		const found = search.matches(ticket());

		// Assert
		expect(found).toBe(false);
	});
});
