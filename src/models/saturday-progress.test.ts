import { describe, expect, it } from 'vitest';

import { SaturdayProgress } from './saturday-progress';

describe('SaturdayProgress', () => {
	it('keeps all steps actionable in the overview before the draw', () => {
		// Arrange
		const progress = SaturdayProgress.overview;

		// Act
		const states = [0, 1, 2, 3].map((step) => progress.stateOf(step, 'lottery_pending'));

		// Assert
		expect(states).not.toContain('skipped');
		expect(progress.shouldTryAgain).toBe(false);
	});

	it.each([SaturdayProgress.overview, SaturdayProgress.awaitingDraw])(
		'crosses out travel and shopping after the draw without a number',
		(progress) => {
			// Arrange, Act
			const states = [2, 3].map((step) => progress.stateOf(step, 'service_started'));

			// Assert
			expect(states).toEqual(['skipped', 'skipped']);
		},
	);

	it('keeps travel and shopping actionable for a guest with a number', () => {
		// Arrange
		const progress = SaturdayProgress.travelling;

		// Act
		const states = [2, 3].map((step) => progress.stateOf(step, 'service_started'));

		// Assert
		expect(states).toEqual(['current', 'upcoming']);
		expect(progress.shouldTryAgain).toBe(false);
	});

	it('ends an unsuccessful draw with skipped steps and an invitation to try again', () => {
		// Arrange
		const progress = SaturdayProgress.forVisit('not_placed');

		// Act
		const states = [0, 1, 2, 3, 4].map((step) => progress?.stateOf(step));

		// Assert
		expect(states).toEqual(['past', 'past', 'skipped', 'skipped', 'current']);
		expect(progress?.shouldTryAgain).toBe(true);
	});

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

	it.each(['called', 'served', 'no_show', 'cancelled'] as const)(
		'shows no progress once a visit is %s',
		(status) => {
			// Arrange, Act
			const progress = SaturdayProgress.forVisit(status);

			// Assert
			expect(progress).toBeNull();
		},
	);
});
