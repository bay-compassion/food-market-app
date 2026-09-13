import { describe, expect, it } from 'vitest';

import type { QueueGuest } from './admin-api.ts';
import { QueueRoster } from './queue-roster.ts';
import type { VisitStatus } from './visitStateMachine.ts';

function guest(id: string, status: VisitStatus, overrides: Partial<QueueGuest> = {}): QueueGuest {
	return {
		id,
		guestId: `record-${id}`,
		firstName: 'Ari',
		lastName: 'Guest',
		phone: '555-0100',
		householdSize: 2,
		locale: 'en',
		queuePosition: null,
		calledAt: null,
		status,
		...overrides,
	};
}

describe('QueueRoster', () => {
	it('orders called guests by how long they have been waiting at the entrance', () => {
		// Arrange
		const recent = guest('recent', 'called', { calledAt: '2026-08-08T18:05:00.000Z' });
		const earliest = guest('earliest', 'called', { calledAt: '2026-08-08T18:00:00.000Z' });

		// Act
		const roster = new QueueRoster([recent, earliest]);

		// Assert
		expect(roster.called.map((each) => each.id)).toEqual(['earliest', 'recent']);
	});

	it('orders waiting guests by queue position, with unplaced guests last', () => {
		// Arrange
		const guests = [
			guest('third', 'waiting', { queuePosition: 3 }),
			guest('unplaced', 'waiting'),
			guest('first', 'waiting', { queuePosition: 1 }),
		];

		// Act
		const roster = new QueueRoster(guests);

		// Assert
		expect(roster.waiting.map((each) => each.id)).toEqual(['first', 'third', 'unplaced']);
	});

	it('collects every way a visit can end into the finished list', () => {
		// Arrange
		const guests: QueueGuest[] = [
			guest('served', 'served'),
			guest('skipped', 'not_placed'),
			guest('absent', 'no_show'),
			guest('gone', 'cancelled'),
			guest('queued', 'waiting'),
		];

		// Act
		const roster = new QueueRoster(guests);

		// Assert
		expect(roster.finished.map((each) => each.id)).toEqual(['served', 'skipped', 'absent', 'gone']);
	});

	it('is complete once every guest of the session has finished', () => {
		// Arrange
		const guests = [guest('a', 'served'), guest('b', 'no_show')];

		// Act
		const roster = new QueueRoster(guests);

		// Assert
		expect(roster.isComplete).toBe(true);
	});

	it.each<VisitStatus>(['waiting', 'called', 'registered'])(
		'is not complete while a guest is still %s',
		(status) => {
			// Arrange
			const guests = [guest('done', 'served'), guest('pending', status)];

			// Act
			const roster = new QueueRoster(guests);

			// Assert
			expect(roster.isComplete).toBe(false);
		},
	);

	it('is not complete with no guests at all, so a queue still loading keeps calling', () => {
		// Arrange
		const guests: QueueGuest[] = [];

		// Act
		const roster = new QueueRoster(guests);

		// Assert
		expect(roster.isComplete).toBe(false);
	});
});
