import { describe, expect, it } from 'vitest';

import { MarketLocation } from './market-location';
import { RecurrencePattern } from './recurrence-pattern';
import { ScheduleRow, type ScheduleSession } from './schedule-row';

const concord = new MarketLocation({
	id: 'location-1',
	name: 'The Bay Church',
	timeZone: 'America/Los_Angeles',
});

const saturdays = new RecurrencePattern(
	{
		id: 'pattern-1',
		startsOn: '2026-09-19',
		registrationOpensAt: '10:30:00',
		registrationDurationMinutes: 60,
		capacity: 30,
		lotteryDelayMinutes: 15,
		autoCloseAfterMinutes: 720,
	},
	concord,
);

function session(overrides: Partial<ScheduleSession> = {}): ScheduleSession {
	return {
		id: 'session-1',
		status: 'scheduled',
		registrationOpensAt: new Date('2026-09-26T17:30:00.000Z'),
		registrationClosesAt: new Date('2026-09-26T18:30:00.000Z'),
		lotteryDrawsAt: null,
		recurrencePatternId: 'pattern-1',
		...overrides,
	};
}

const now = new Date('2026-09-22T12:00:00.000Z');

describe('ScheduleRow', () => {
	it('describes the pattern', () => {
		// Act
		const row = ScheduleRow.forPattern(saturdays, true, now);

		// Assert
		expect(row.isPattern).toBe(true);
		expect(row.statusLabel).toBe('Recurring');
		expect(row.dateLabel).toBe('Every Saturday · from Sep 19, 2026');
		expect(row.registrationLabel).toBe('10:30 AM – 11:30 AM');
		expect(row.lotteryLabel).toBe('15 min after close');
		expect(row.actions).toEqual(['edit', 'delete']);
	});

	it('offers to create the next session only when none is unfinished', () => {
		// Act
		const row = ScheduleRow.forPattern(saturdays, false, now);

		// Assert
		expect(row.actions).toEqual(['edit', 'delete', 'create_next_session']);
	});

	it('matches the pattern’s dates from today on', () => {
		// Arrange
		const row = ScheduleRow.forPattern(saturdays, true, now);

		// Act
		const matches = ['2026-09-19', '2026-09-26', '2026-09-27'].map((date) => row.matchesDate(date));

		// Assert
		expect(matches).toEqual([false, true, false]);
	});

	it('describes a pending pattern session, which cannot be deleted on its own', () => {
		// Act
		const row = ScheduleRow.forSession(session(), concord);

		// Assert
		expect(row.statusLabel).toBe('Pending');
		expect(row.dateLabel).toBe('Sat, Sep 26');
		expect(row.registrationLabel).toBe('10:30 AM – 11:30 AM');
		expect(row.lotteryLabel).toBe('Manual');
		expect(row.actions).toEqual(['start_now', 'edit']);
		expect(row.matchesDate('2026-09-26')).toBe(true);
	});

	it('lets a pending one-off session be deleted', () => {
		// Act
		const row = ScheduleRow.forSession(session({ recurrencePatternId: null }), concord);

		// Assert
		expect(row.actions).toEqual(['start_now', 'edit', 'delete']);
	});

	it('sends an active session to the Session tab', () => {
		// Act
		const row = ScheduleRow.forSession(
			session({
				status: 'lottery_pending',
				lotteryDrawsAt: new Date('2026-09-26T18:45:30.000Z'),
			}),
			concord,
		);

		// Assert
		expect(row.statusLabel).toBe('Active');
		expect(row.lotteryLabel).toBe('11:45 AM');
		expect(row.actions).toEqual(['go_to_session']);
	});

	it('refuses an ended session', () => {
		// Act
		const create = () => ScheduleRow.forSession(session({ status: 'ended' }), concord);

		// Assert
		expect(create).toThrow(RangeError);
	});
});
