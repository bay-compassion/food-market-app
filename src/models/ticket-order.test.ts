import { describe, expect, it } from 'vitest';

import type { QueueGuest } from '../services/admin-api.ts';
import { TicketOrder } from './ticket-order.ts';

function ticket(id: string, firstName: string, lastName: string, queuePosition: number | null) {
	return { id, firstName, lastName, queuePosition, priorityNumber: null } as QueueGuest;
}

const ana = ticket('a', 'Ana', 'Reyes', 3);
const bao = ticket('b', 'Bao', 'Nguyen', 1);
const tomas = ticket('c', 'Tomás', 'Álvarez', 2);

describe('TicketOrder', () => {
	it('keeps the order a section already has in queue order', () => {
		// Arrange
		const order = new TicketOrder();

		// Act
		const ordered = order.apply([ana, bao, tomas]);

		// Assert
		expect(ordered).toEqual([ana, bao, tomas]);
	});

	it('orders by last name, ignoring accents', () => {
		// Arrange
		const order = new TicketOrder('lastName');

		// Act
		const ordered = order.apply([ana, bao, tomas]);

		// Assert
		expect(ordered.map(({ id }) => id)).toEqual(['c', 'b', 'a']);
	});

	it('orders by first name, then last name, then number', () => {
		// Arrange
		const order = new TicketOrder('firstName');
		const anotherAna = ticket('d', 'ana', 'Reyes', 1);

		// Act
		const ordered = order.apply([tomas, ana, bao, anotherAna]);

		// Assert
		expect(ordered.map(({ id }) => id)).toEqual(['d', 'a', 'b', 'c']);
	});

	it('leaves the list it was given as it was', () => {
		// Arrange
		const guests = [ana, bao];

		// Act
		new TicketOrder('lastName').apply(guests);

		// Assert
		expect(guests).toEqual([ana, bao]);
	});
});
