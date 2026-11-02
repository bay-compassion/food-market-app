import { describe, expect, it } from 'vitest';

import { DrawRecord, type DrawOutcome } from './draw-record.ts';

function record(results: string, chance = 0.5) {
	const outcomes: DrawOutcome[] = [...results].map((result, index) => ({
		drawId: `draw-${index}`,
		chance,
		won: result === 'w',
	}));

	return new DrawRecord(outcomes);
}

describe('DrawRecord', () => {
	it('counts draws, numbers, and misses', () => {
		// Arrange
		const history = record('mwwmmm');

		// Act
		const counts = [history.draws, history.numbers, history.missed];

		// Assert
		expect(counts).toEqual([6, 2, 4]);
	});

	it('counts the misses since the last number', () => {
		// Arrange
		const history = record('wmwmmm');

		// Act
		const streak = history.missedInARow;

		// Assert
		expect(streak).toBe(3);
	});

	it('counts every draw as a miss for a person who never got a number', () => {
		// Arrange
		const history = record('mmmm');

		// Act
		const streak = history.missedInARow;

		// Assert
		expect(streak).toBe(4);
	});

	it('weighs each draw at its own odds', () => {
		// Arrange
		const history = new DrawRecord([
			{ drawId: 'a', chance: 0.2, won: false },
			{ drawId: 'b', chance: 0.9, won: true },
		]);

		// Act
		const { expectedNumbers, variance } = history;

		// Assert
		expect(expectedNumbers).toBeCloseTo(1.1);
		expect(variance).toBeCloseTo(0.25);
	});

	it('reads the record as it stood before a draw', () => {
		// Arrange
		const history = record('wmm');

		// Act
		const earlier = history.before('draw-2');

		// Assert
		expect(earlier.draws).toBe(2);
		expect(earlier.missedInARow).toBe(1);
	});
});
