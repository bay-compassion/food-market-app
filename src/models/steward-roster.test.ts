import { describe, expect, it } from 'vitest';

import type { StewardLedgerResponse, StewardPerson } from '../services/steward-api.ts';
import { StewardRoster } from './steward-roster.ts';

const draws = ['a', 'b', 'c', 'd'].map((id, index) => ({
	id,
	opensAt: `2026-10-0${index + 3}T17:30:00.000Z`,
	spots: 1,
	tiers: [],
	suggestedTiers: [],
	oddsSkipped: false,
}));

function person(id: string, results: string, overrides: Partial<StewardPerson> = {}) {
	return {
		id,
		name: id,
		phoneLast4: '0123',
		householdSize: 2,
		records: 1,
		weight: 1,
		setting: null,
		outcomes: results
			.split('')
			.flatMap((result, index) =>
				result === '-' ? [] : [{ drawId: draws[index]!.id, chance: 0.5, won: result === 'w' }],
			),
		...overrides,
	};
}

function roster(people: StewardPerson[], upcoming: StewardLedgerResponse['upcoming'] = null) {
	return new StewardRoster({ draws, upcoming, people, changes: [] });
}

describe('StewardRoster', () => {
	it('derives a person’s marks, temperature, and suggestion', () => {
		// Arrange
		const { people } = roster([person('rosa', '-mmm')]);

		// Act
		const rosa = people[0]!;

		// Assert
		expect(rosa.weeks).toEqual(['none', 'missed', 'missed', 'missed']);
		expect(rosa.temperature).toBe('cold');
		expect(rosa.suggestedWeight).toBe(2);
		expect(rosa.lastNumberAt).toBeNull();
	});

	it('finds when someone last got a number', () => {
		// Arrange
		const { people } = roster([person('rosa', 'wwmm')]);

		// Act
		const last = people[0]!.lastNumberAt;

		// Assert
		expect(last).toBe(draws[1]!.opensAt);
	});

	it('bands streaks and what even odds alone would give', () => {
		// Arrange
		const { streakBands } = roster([person('a', 'mmmw'), person('b', 'wwmm')]);

		// Act
		const [none, one, two] = streakBands;

		// Assert
		expect(none).toMatchObject({ people: 1, expected: 1 });
		expect(one).toMatchObject({ people: 0, expected: 0.5 });
		expect(two).toMatchObject({ people: 1, expected: 0.25 });
		expect(streakBands.reduce((sum, band) => sum + band.expected, 0)).toBeCloseTo(2);
	});

	it('shares misses by how often people come', () => {
		// Arrange
		const { frequencyBands } = roster([person('a', 'mmmw'), person('b', '---m')]);

		// Act
		const [once, , several] = frequencyBands;

		// Assert
		expect(once).toMatchObject({ people: 1, missedShare: 1 });
		expect(several).toMatchObject({ people: 1, missedShare: 0.75 });
	});

	it('reads a draw’s misses by each person’s temperature going in', () => {
		// Arrange
		const result = roster([person('a', 'mmmm'), person('b', 'wwwm')]);

		// Act
		const tallies = result.missesByTemperature('d');

		// Assert
		expect(tallies.find(({ level }) => level === 'cold')).toEqual({
			level: 'cold',
			missed: 1,
			entries: 1,
		});
		expect(tallies.find(({ level }) => level === 'hot')).toEqual({
			level: 'hot',
			missed: 1,
			entries: 1,
		});
	});

	it('counts only entrants among raised guests and pool temperature', () => {
		// Arrange
		const result = roster(
			[person('in', 'mmmm', { weight: 2 }), person('out', 'mmmm', { weight: 5 })],
			{
				id: 'next',
				status: 'registration_open',
				opensAt: draws[0]!.opensAt,
				spots: 1,
				tiers: [],
				suggestedTiers: [],
				entrants: ['in'],
			},
		);

		// Act
		const raised = result.raisedEntrants.map(({ id }) => id);

		// Assert
		expect(raised).toEqual(['in']);
		expect(result.upcomingTemperatureCounts.cold).toBe(1);
	});

	it('orders the longest shut out by streak', () => {
		// Arrange
		const { longestShutOut } = roster([
			person('a', 'wwwm'),
			person('b', 'wmmm'),
			person('c', 'mmmw'),
		]);

		// Act
		const names = longestShutOut.map(({ name }) => name);

		// Assert
		expect(names).toEqual(['b', 'a']);
	});
});
