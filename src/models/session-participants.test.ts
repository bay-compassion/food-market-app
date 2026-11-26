import { describe, expect, it } from 'vitest';

import type { QueueGuest } from '../services/admin-api.ts';
import type { VisitStatus } from '../services/visitStateMachine.ts';
import { SessionParticipants } from './session-participants.ts';

function guest(
	id: string,
	status: VisitStatus,
	number: { queuePosition?: number; priorityNumber?: number } = {},
	lastName = id,
): QueueGuest {
	return {
		id,
		guestId: `guest-${id}`,
		firstName: 'Pat',
		lastName,
		pronunciation: null,
		phone: '5105550100',
		householdSize: 2,
		locale: 'en',
		queuePosition: number.queuePosition ?? null,
		priorityNumber: number.priorityNumber ?? null,
		queueFront: false,
		queueOrder: null,
		calledAt: null,
		status,
		track: 'lottery',
	};
}

describe('SessionParticipants', () => {
	it('groups guests by status, finished statuses first, leaving out empty ones', () => {
		// Arrange
		const participants = new SessionParticipants([
			guest('a', 'cancelled'),
			guest('b', 'waiting'),
			guest('c', 'served'),
			guest('d', 'no_show'),
		]);

		// Act
		const statuses = participants.groups.map((group) => group.status);

		// Assert
		expect(statuses).toEqual(['served', 'no_show', 'cancelled', 'waiting']);
	});

	it('orders a group by number, priority numbers first, and unnumbered guests by last name', () => {
		// Arrange
		const participants = new SessionParticipants([
			guest('zed', 'served', {}, 'Zed'),
			guest('twelve', 'served', { queuePosition: 12 }),
			guest('adams', 'served', {}, 'Adams'),
			guest('p2', 'served', { priorityNumber: 2 }),
			guest('three', 'served', { queuePosition: 3 }),
		]);

		// Act
		const order = participants.groups[0]?.guests.map((entry) => entry.id);

		// Assert
		expect(order).toEqual(['p2', 'three', 'twelve', 'adams', 'zed']);
	});

	it('counts everyone', () => {
		// Arrange
		const participants = new SessionParticipants([guest('a', 'served'), guest('b', 'no_show')]);

		// Act
		const count = participants.count;

		// Assert
		expect(count).toBe(2);
	});
});
