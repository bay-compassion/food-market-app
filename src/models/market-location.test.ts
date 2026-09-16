import { describe, expect, it } from 'vitest';

import { MarketLocation } from './market-location';

const concord = new MarketLocation({
	id: 'location-1',
	name: 'The Bay Church',
	timeZone: 'America/Los_Angeles',
});

describe('MarketLocation', () => {
	it('rejects an unknown time zone', () => {
		// Arrange
		const record = { id: 'location-2', name: 'Nowhere', timeZone: 'Mars/Olympus_Mons' };

		// Act
		const create = () => new MarketLocation(record);

		// Assert
		expect(create).toThrow(RangeError);
	});

	it.each([
		['standard time', '2026-12-05', '10:30', '2026-12-05T18:30:00.000Z'],
		['daylight saving time', '2026-09-19', '10:30', '2026-09-19T17:30:00.000Z'],
		// 2026-11-01: clocks fall back from 2:00 PDT to 1:00 PST, so 1:30 happens twice.
		['the first of a repeated fall-back time', '2026-11-01', '01:30', '2026-11-01T08:30:00.000Z'],
		// 2027-03-14: clocks spring forward from 2:00 PST to 3:00 PDT, so 2:30 never happens.
		[
			'a skipped spring-forward time, moved past the gap',
			'2027-03-14',
			'02:30',
			'2027-03-14T10:30:00.000Z',
		],
		['a time just after the spring-forward gap', '2027-03-14', '03:00', '2027-03-14T10:00:00.000Z'],
	])('resolves %s to an instant', (_case, date, time, expected) => {
		// Act
		const instant = concord.instantAt(date, time);

		// Assert
		expect(instant.toISOString()).toBe(expected);
	});

	it('shows a skipped spring-forward time at its shifted wall-clock time', () => {
		// Arrange
		const instant = concord.instantAt('2027-03-14', '02:30');

		// Act
		const shown = concord.formatTime(instant);

		// Assert
		expect(shown).toBe('3:30 AM');
	});

	it('accepts a database time with seconds', () => {
		// Act
		const instant = concord.instantAt('2026-09-19', '10:30:00');

		// Assert
		expect(instant.toISOString()).toBe('2026-09-19T17:30:00.000Z');
	});

	it('reads the local date in the location, not in UTC', () => {
		// Arrange: 9:30 PM on Friday in Concord is already Saturday in UTC.
		const instant = new Date('2026-09-19T04:30:00.000Z');

		// Act
		const date = concord.localDateOf(instant);

		// Assert
		expect(date).toBe('2026-09-18');
	});

	it('formats dates and times for the admin', () => {
		// Arrange
		const instant = new Date('2026-09-26T17:30:00.000Z');

		// Act
		const shown = [
			concord.formatDate(instant),
			concord.formatDate('2026-09-26'),
			concord.formatLongDate('2026-09-19'),
			concord.formatTime(instant),
		];

		// Assert
		expect(shown).toEqual(['Sat, Sep 26', 'Sat, Sep 26', 'Sep 19, 2026', '10:30 AM']);
	});

	it('does calendar arithmetic without drifting across daylight saving time', () => {
		// Act
		const later = MarketLocation.addDays('2026-10-31', 7);
		const days = MarketLocation.daysBetween('2027-03-07', '2027-03-21');

		// Assert
		expect(later).toBe('2026-11-07');
		expect(days).toBe(14);
	});
});
