import { describe, expect, it } from 'vitest';

import { LateArrival } from './late-arrival';

const calledAt = new Date('2026-10-17T18:30:00.000Z');
const minutesLater = (minutes: number) => calledAt.valueOf() + minutes * 60_000;

describe('LateArrival', () => {
	it('stays green for three minutes, then warms faster each minute, full at ten', () => {
		// Arrange
		const arrival = new LateArrival(calledAt);

		// Act
		const warmth = [0, 2, 3, 4, 6.5, 10, 25].map((minutes) =>
			arrival.warmthAt(minutesLater(minutes)),
		);

		// Assert
		[0, 0, 0, (1 / 7) ** 2, 0.25, 1, 1].forEach((expected, index) =>
			expect(warmth[index]).toBeCloseTo(expected),
		);
	});

	it('gains more in each minute past the grace than in the one before', () => {
		// Arrange
		const arrival = new LateArrival(calledAt);
		const warmth = [3, 4, 5, 6, 7, 8, 9, 10].map((minutes) =>
			arrival.warmthAt(minutesLater(minutes)),
		);

		// Act
		const steps = warmth.slice(1).map((value, index) => value - warmth[index]!);

		// Assert
		steps.slice(1).forEach((step, index) => expect(step).toBeGreaterThan(steps[index]!));
	});

	it('is late only once the board is fully yellow', () => {
		// Arrange
		const arrival = new LateArrival(calledAt);

		// Act
		const late = [9.9, 10, 40].map((minutes) => arrival.isLateAt(minutesLater(minutes)));

		// Assert
		expect(late).toEqual([false, true, true]);
	});

	it('counts whole minutes, and never runs backwards on a slow clock', () => {
		// Arrange
		const arrival = new LateArrival(calledAt);

		// Act
		const minutes = [-1, 0.5, 4.9].map((offset) => arrival.minutesSince(minutesLater(offset)));

		// Assert
		expect(minutes).toEqual([0, 0, 4]);
	});
});
