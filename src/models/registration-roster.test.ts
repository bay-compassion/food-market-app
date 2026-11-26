import { describe, expect, it } from 'vitest';

import type { QueueGuest } from '../services/admin-api';
import { RegistrationRoster } from './registration-roster';

function guest(id: string, overrides: Partial<QueueGuest>): QueueGuest {
	return {
		id,
		guestId: `guest-${id}`,
		firstName: 'Pat',
		lastName: id,
		pronunciation: null,
		phone: '5105550100',
		householdSize: 2,
		locale: 'en',
		queuePosition: null,
		priorityNumber: null,
		queueFront: false,
		queueOrder: null,
		calledAt: null,
		status: 'registered',
		track: 'lottery',
		...overrides,
	};
}

describe('RegistrationRoster', () => {
	it('keeps premarket volunteers out of the draw’s pool, in a list of their own', () => {
		// Arrange
		const roster = new RegistrationRoster([
			guest('entered', {}),
			guest('volunteer', { status: 'served', track: 'premarket' }),
			guest('removed', { status: 'cancelled', track: 'premarket' }),
		]);

		// Act
		const pool = roster.registered.map(({ id }) => id);
		const premarket = roster.premarket.map(({ id }) => id);
		const cancelled = roster.cancelled.map(({ id }) => id);

		// Assert
		expect(pool).toEqual(['entered']);
		expect(premarket).toEqual(['volunteer']);
		expect(cancelled).toEqual(['removed']);
	});
});
