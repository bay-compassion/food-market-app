import { describe, expect, it } from 'vitest';

import { MarketLocation } from './market-location';
import { RecurrencePattern, type RecurrencePatternRecord } from './recurrence-pattern';

const concord = new MarketLocation({
	id: 'location-1',
	name: 'The Bay Church',
	timeZone: 'America/Los_Angeles',
});

function pattern(overrides: Partial<RecurrencePatternRecord> = {}) {
	return new RecurrencePattern(
		{
			id: 'pattern-1',
			// A Saturday.
			startsOn: '2026-09-19',
			registrationOpensAt: '10:30',
			registrationDurationMinutes: 60,
			capacity: 30,
			lotteryDelayMinutes: null,
			autoCloseAfterMinutes: 720,
			...overrides,
		},
		concord,
	);
}

describe('RecurrencePattern', () => {
	it('describes itself by weekday and start date', () => {
		// Act
		const described = pattern();

		// Assert
		expect(described.weekday).toBe(6);
		expect(described.description).toBe('Every Saturday · from Sep 19, 2026');
	});

	it('occurs weekly from its start date, and not before', () => {
		// Arrange
		const saturdays = pattern();

		// Act
		const occurs = ['2026-09-12', '2026-09-19', '2026-09-20', '2026-09-26', '2026-10-03'].map(
			(date) => saturdays.occursOn(date),
		);

		// Assert
		expect(occurs).toEqual([false, true, false, true, true]);
	});

	it('gives the first occurrence when the start date is still ahead', () => {
		// Act
		const next = pattern().nextOccurrence(new Date('2026-09-16T12:00:00.000Z'));

		// Assert
		expect(next.date).toBe('2026-09-19');
		expect(next.registrationOpensAt.toISOString()).toBe('2026-09-19T17:30:00.000Z');
		expect(next.registrationClosesAt.toISOString()).toBe('2026-09-19T18:30:00.000Z');
	});

	it('moves to the following week when a session closes after that day’s opening', () => {
		// Arrange: Saturday's session closed at 1 PM Pacific.
		const closedAt = new Date('2026-09-26T20:00:00.000Z');

		// Act
		const next = pattern().nextOccurrence(closedAt);

		// Assert
		expect(next.date).toBe('2026-10-03');
	});

	it('recreates the same week when a session started early closes before that day’s opening', () => {
		// Arrange: Saturday's session was started and closed on Friday.
		const closedAt = new Date('2026-09-25T22:00:00.000Z');

		// Act
		const next = pattern().nextOccurrence(closedAt);

		// Assert
		expect(next.date).toBe('2026-09-26');
	});

	it('excludes an occurrence opening at exactly the given moment', () => {
		// Act
		const next = pattern().nextOccurrence(new Date('2026-09-26T17:30:00.000Z'));

		// Assert
		expect(next.date).toBe('2026-10-03');
	});

	it('keeps its wall-clock time across the fall-back transition', () => {
		// Arrange: Sunday 2026-11-01 is the fall-back date.
		const sundays = pattern({ startsOn: '2026-10-25' });

		// Act
		const before = sundays.occurrenceOn('2026-10-25');
		const after = sundays.occurrenceOn('2026-11-01');

		// Assert
		expect(before.registrationOpensAt.toISOString()).toBe('2026-10-25T17:30:00.000Z');
		expect(after.registrationOpensAt.toISOString()).toBe('2026-11-01T18:30:00.000Z');
	});

	it('keeps its wall-clock time across the spring-forward transition', () => {
		// Arrange: Sunday 2027-03-14 is the spring-forward date.
		const sundays = pattern({ startsOn: '2027-03-07' });

		// Act
		const before = sundays.occurrenceOn('2027-03-07');
		const after = sundays.occurrenceOn('2027-03-14');

		// Assert
		expect(before.registrationOpensAt.toISOString()).toBe('2027-03-07T18:30:00.000Z');
		expect(after.registrationOpensAt.toISOString()).toBe('2027-03-14T17:30:00.000Z');
	});

	it('resolves occurrences inside the transitions the same way as the location', () => {
		// Arrange
		const fallBack = pattern({ startsOn: '2026-11-01', registrationOpensAt: '01:30' });
		const springForward = pattern({ startsOn: '2027-03-14', registrationOpensAt: '02:30' });

		// Act
		const repeated = fallBack.occurrenceOn('2026-11-01');
		const skipped = springForward.occurrenceOn('2027-03-14');

		// Assert
		expect(repeated.registrationOpensAt.toISOString()).toBe('2026-11-01T08:30:00.000Z');
		expect(skipped.registrationOpensAt.toISOString()).toBe('2027-03-14T10:30:00.000Z');
	});

	it('refuses a date it does not occur on', () => {
		// Act
		const occurrence = () => pattern().occurrenceOn('2026-09-20');

		// Assert
		expect(occurrence).toThrow(RangeError);
	});

	it('lists its dates across a month boundary', () => {
		// Act
		const dates = pattern().occurrencesBetween('2026-09-27', '2026-10-31');

		// Assert
		expect(dates).toEqual(['2026-10-03', '2026-10-10', '2026-10-17', '2026-10-24', '2026-10-31']);
	});

	it('lists nothing before its start date', () => {
		// Act
		const dates = pattern().occurrencesBetween('2026-09-01', '2026-09-18');

		// Assert
		expect(dates).toEqual([]);
	});

	it('supplies the values for a new session', () => {
		// Act
		const values = pattern({ lotteryDelayMinutes: 15 }).sessionValues('2026-09-26');

		// Assert
		expect(values).toEqual({
			date: '2026-09-26',
			registrationOpensAt: new Date('2026-09-26T17:30:00.000Z'),
			registrationClosesAt: new Date('2026-09-26T18:30:00.000Z'),
			locationId: 'location-1',
			recurrencePatternId: 'pattern-1',
			capacity: 30,
			lotteryDelayMinutes: 15,
			autoCloseAfterMinutes: 720,
		});
	});
});
