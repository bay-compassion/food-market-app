import { describe, expect, it } from 'vitest';

import { SaturdayProgress } from './saturday-progress';

describe('SaturdayProgress', () => {
	it('puts a registered guest on the draw, still to come', () => {
		// Arrange
		const progress = SaturdayProgress.forVisit('registered');

		// Act
		const states = [0, 1, 2, 3].map((step) => progress?.stateOf(step));

		// Assert
		expect(progress?.marker).toBe('next');
		expect(states).toEqual(['past', 'current', 'upcoming', 'upcoming']);
	});

	it('puts a guest holding a number on the way to the market, now', () => {
		// Arrange
		const progress = SaturdayProgress.forVisit('waiting');

		// Act
		const states = [0, 1, 2, 3].map((step) => progress?.stateOf(step));

		// Assert
		expect(progress?.marker).toBe('now');
		expect(states).toEqual(['past', 'past', 'current', 'upcoming']);
	});

	it.each(['called', 'served', 'not_placed', 'no_show', 'cancelled'] as const)(
		'shows no progress once a visit is %s',
		(status) => {
			// Arrange, Act
			const progress = SaturdayProgress.forVisit(status);

			// Assert
			expect(progress).toBeNull();
		},
	);
});
