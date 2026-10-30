import { describe, expect, it } from 'vitest';

import { SaturdayClock } from './saturday-clock';

const session = {
	status: 'registration_open' as const,
	registrationOpensAt: new Date('2026-10-31T17:30:00Z'),
};

describe('SaturdayClock', () => {
	it.each([
		['2026-10-31T17:30:00Z', 0, 1, 0],
		['2026-10-31T17:37:30Z', 0, 1, 0.5],
		['2026-10-31T17:45:00Z', 1, 3, 0],
		['2026-10-31T18:00:00Z', 1, 3, 1 / 3],
		['2026-10-31T18:30:00Z', 1, 3, 1],
		['2026-10-31T20:00:00Z', 1, 3, 1],
	] as const)(
		'interpolates published times at %s and stops at shopping',
		(time, fromStep, toStep, fraction) => {
			// Arrange
			const clock = new SaturdayClock(session);

			// Act
			const position = clock.positionAt(Date.parse(time));

			// Assert
			expect(position).toEqual({ fromStep, toStep, fraction });
		},
	);

	it.each(['2026-10-31T17:29:59Z', '2026-10-30T18:00:00Z', '2026-11-01T18:00:00Z'])(
		'hides the indicator outside this market morning (%s)',
		(time) => {
			// Arrange
			const clock = new SaturdayClock(session);

			// Act
			const position = clock.positionAt(Date.parse(time));

			// Assert
			expect(position).toBeNull();
		},
	);

	it.each(['scheduled', 'ended'] as const)(
		'does not move along an inactive %s session',
		(status) => {
			// Arrange
			const clock = new SaturdayClock({ ...session, status });

			// Act
			const position = clock.positionAt(Date.parse('2026-10-31T18:00:00Z'));

			// Assert
			expect(position).toBeNull();
		},
	);

	it('keeps Pacific market time after daylight saving time ends', () => {
		// Arrange
		const clock = new SaturdayClock({
			...session,
			registrationOpensAt: new Date('2026-11-07T18:30:00Z'),
		});

		// Act
		const position = clock.positionAt(Date.parse('2026-11-07T19:00:00Z'));

		// Assert
		expect(position?.fraction).toBeCloseTo(1 / 3);
		expect(clock.labelAt(Date.parse('2026-11-07T19:00:00Z'), 'en')).toBe('11:00 AM');
	});

	it('does not turn a delayed draw into an awarded number', () => {
		// Arrange
		const clock = new SaturdayClock({ ...session, status: 'lottery_pending' });

		// Act
		const position = clock.positionAt(Date.parse('2026-10-31T18:00:00Z'));

		// Assert
		expect(position).toEqual({ fromStep: 1, toStep: 3, fraction: 1 / 3 });
	});
});
