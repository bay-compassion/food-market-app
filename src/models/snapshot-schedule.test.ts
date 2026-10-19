import { describe, expect, it } from 'vitest';

import { SnapshotSchedule } from './snapshot-schedule';

const zone = 'America/Los_Angeles';
const september = [
	new Date('2026-09-05T17:30:00.000Z'),
	new Date('2026-09-12T17:30:00.000Z'),
	new Date('2026-09-26T17:30:00.000Z'),
];
// Midday Pacific, 8 October: September and every session in it have settled.
const now = new Date('2026-10-08T19:00:00.000Z');

describe('SnapshotSchedule', () => {
	it('owes every settled session and period since the first session', () => {
		// Arrange
		const schedule = new SnapshotSchedule(september, [], zone, 7);

		// Act
		const due = schedule.dueAt(now);

		// Assert
		expect(due.map(({ kind, start }) => `${kind} ${start.toISOString()}`)).toEqual([
			'session 2026-09-05T17:30:00.000Z',
			'session 2026-09-12T17:30:00.000Z',
			'session 2026-09-26T17:30:00.000Z',
			'month 2026-09-01T07:00:00.000Z',
			'quarter 2026-07-01T07:00:00.000Z',
		]);
	});

	it('does not owe a session still inside its settling days', () => {
		// Arrange
		const lastSaturday = new Date('2026-10-03T17:30:00.000Z');
		const schedule = new SnapshotSchedule([lastSaturday], [], zone, 7);

		// Act
		const due = schedule.dueAt(now);

		// Assert
		expect(due).toEqual([]);
	});

	it('does not owe a snapshot the warehouse already has', () => {
		// Arrange
		const taken = [
			{ kind: 'session' as const, periodStart: september[0]! },
			{ kind: 'month' as const, periodStart: new Date('2026-09-01T07:00:00.000Z') },
		];
		const schedule = new SnapshotSchedule(september, taken, zone, 7);

		// Act
		const due = schedule.dueAt(now);

		// Assert
		expect(due.map(({ kind }) => kind)).toEqual(['session', 'session', 'quarter']);
	});

	it('owes nothing before the market has ended a session', () => {
		// Arrange
		const schedule = new SnapshotSchedule([], [], zone, 7);

		// Act
		const due = schedule.dueAt(now);

		// Assert
		expect(due).toEqual([]);
	});
});
