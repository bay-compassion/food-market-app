import { describe, expect, it } from 'vitest';

import type { SessionStatus } from '../services/sessionStateMachine';
import { MarketLocation } from './market-location';
import { PremarketWindow } from './premarket-window';

const location = new MarketLocation({
	id: 'location-1',
	name: 'Bay Point',
	timeZone: 'America/Los_Angeles',
});

/** A Saturday session whose registration opens at 9:00 and closes at 10:00, Pacific time. */
function window(status: SessionStatus = 'scheduled') {
	return new PremarketWindow(
		{
			status,
			registrationOpensAt: new Date('2026-07-18T16:00:00.000Z'),
			registrationClosesAt: new Date('2026-07-18T17:00:00.000Z'),
		},
		location,
	);
}

describe('PremarketWindow', () => {
	it.each([
		['the day before, in the evening', '2026-07-18T03:00:00.000Z', false],
		['just after midnight on market day', '2026-07-18T07:30:00.000Z', true],
		['before registration opens', '2026-07-18T15:00:00.000Z', true],
		['while registration is open', '2026-07-18T16:30:00.000Z', true],
		['while the draw is pending', '2026-07-18T17:30:00.000Z', true],
	] as const)('for a scheduled session, %s: open is %s', (_, now, expected) => {
		// Act
		const open = window().isOpenAt(new Date(now));

		// Assert
		expect(open).toBe(expected);
	});

	it.each(['service_started', 'ended'] as const)('closes once the session is %s', (status) => {
		// Act
		const open = window(status).isOpenAt(new Date('2026-07-18T18:00:00.000Z'));

		// Assert
		expect(open).toBe(false);
	});

	it('reads the market day in the location’s time zone, not UTC', () => {
		// Arrange
		const lateFriday = new Date('2026-07-18T06:30:00.000Z'); // 23:30 Friday in Los Angeles

		// Act
		const open = window().isOpenAt(lateFriday);

		// Assert
		expect(window().marketDate).toBe('2026-07-18');
		expect(open).toBe(false);
	});
});
