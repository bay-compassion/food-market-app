import { describe, expect, it } from 'vitest';

import { WarehousePeriod } from './warehouse-period';

const zone = 'America/Los_Angeles';

describe('WarehousePeriod', () => {
	it('draws a month in the market time zone', () => {
		// Arrange: 11pm Pacific on 31 March is already April in UTC.
		const lateMarch = new Date('2026-04-01T06:00:00.000Z');

		// Act
		const period = WarehousePeriod.containing('month', lateMarch, zone);

		// Assert
		expect(period.start.toISOString()).toBe('2026-03-01T08:00:00.000Z');
		expect(period.end.toISOString()).toBe('2026-04-01T07:00:00.000Z');
	});

	it('draws a quarter', () => {
		// Arrange
		const august = new Date('2026-08-15T18:00:00.000Z');

		// Act
		const period = WarehousePeriod.containing('quarter', august, zone);

		// Assert
		expect(period.start.toISOString()).toBe('2026-07-01T07:00:00.000Z');
		expect(period.end.toISOString()).toBe('2026-10-01T07:00:00.000Z');
	});

	it('lists only the periods that settled by now', () => {
		// Arrange: September ended a week ago at the start of 8 October, Pacific.
		const first = new Date('2026-07-12T18:00:00.000Z');
		const now = new Date('2026-10-08T07:00:00.000Z');

		// Act
		const months = WarehousePeriod.settled('month', first, now, zone, 7);

		// Assert
		expect(months.map((month) => month.start.toISOString())).toEqual([
			'2026-07-01T07:00:00.000Z',
			'2026-08-01T07:00:00.000Z',
			'2026-09-01T07:00:00.000Z',
		]);
	});

	it('does not list a period still inside its settling days', () => {
		// Arrange
		const first = new Date('2026-09-12T18:00:00.000Z');
		const now = new Date('2026-10-07T06:59:59.000Z');

		// Act
		const months = WarehousePeriod.settled('month', first, now, zone, 7);

		// Assert
		expect(months).toEqual([]);
	});
});
