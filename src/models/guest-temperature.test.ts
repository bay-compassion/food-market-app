import { describe, expect, it } from 'vitest';

import { DrawRecord } from './draw-record.ts';
import { GuestTemperature } from './guest-temperature.ts';

function temperature(draws: number, numbers: number, chance = 0.5) {
	const outcomes = Array.from({ length: draws }, (_, index) => ({
		drawId: `draw-${index}`,
		chance,
		won: index < numbers,
	}));

	return new GuestTemperature(new DrawRecord(outcomes)).level;
}

describe('GuestTemperature', () => {
	it.each([
		[2, 'cold'],
		[3, 'cool'],
		[4, 'even'],
		[5, 'even'],
		[6, 'warm'],
		[7, 'hot'],
	])('reads %i numbers from 9 even draws as %s', (numbers, level) => {
		// Act
		const result = temperature(9, numbers);

		// Assert
		expect(result).toBe(level);
	});

	it('calls fewer than 3 draws too few to say', () => {
		// Act
		const result = temperature(2, 0);

		// Assert
		expect(result).toBe('new');
	});

	it('forgives a miss more when few spots were offered', () => {
		// Act
		const scarce = temperature(4, 0, 0.1);
		const plentiful = temperature(4, 0, 0.5);

		// Assert
		expect(scarce).toBe('cool');
		expect(plentiful).toBe('cold');
	});

	it('treats draws everyone got into as even', () => {
		// Act
		const result = temperature(5, 5, 1);

		// Assert
		expect(result).toBe('even');
	});
});
