import { describe, expect, it } from 'vitest';

import { DrawLedger } from './draw-ledger.ts';

const draws = [
	{ id: 'a', opensAt: new Date('2026-10-24T17:30:00Z') },
	{ id: 'b', opensAt: new Date('2026-10-31T17:30:00Z') },
];

describe('DrawLedger', () => {
	it('reads a person’s record oldest first, at each draw’s own odds', () => {
		// Arrange
		const ledger = new DrawLedger(draws, [
			{ drawId: 'b', personId: 'rosa', won: false },
			{ drawId: 'a', personId: 'rosa', won: true },
			{ drawId: 'a', personId: 'minh', won: false },
			{ drawId: 'a', personId: 'ana', won: false },
			{ drawId: 'a', personId: 'lee', won: true },
		]);

		// Act
		const { outcomes } = ledger.recordOf('rosa');

		// Assert
		expect(outcomes).toEqual([
			{ drawId: 'a', chance: 0.5, won: true },
			{ drawId: 'b', chance: 0, won: false },
		]);
	});

	it('counts two records of one person once, as a number if either got one', () => {
		// Arrange
		const ledger = new DrawLedger(draws, [
			{ drawId: 'a', personId: 'rosa', won: false },
			{ drawId: 'a', personId: 'rosa', won: true },
		]);

		// Act
		const { draws: entered, numbers } = ledger.recordOf('rosa');

		// Assert
		expect(entered).toBe(1);
		expect(numbers).toBe(1);
		expect(ledger.entriesIn('a')).toBe(1);
	});

	it('gives someone with no entries an empty record', () => {
		// Arrange
		const ledger = new DrawLedger(draws, []);

		// Act
		const { draws: entered } = ledger.recordOf('nobody');

		// Assert
		expect(entered).toBe(0);
		expect(ledger.chanceOf('a')).toBe(0);
	});
});
