/** Everyone in a draw holding the same odds. */
export type DrawTier = { weight: number; entries: number };

/**
 * Rehearses a draw from tier sizes alone, so a steward's browser never needs a guest's name. It
 * orders entries the way the real draw does, `random^(1/weight)` descending, and it can't predict a
 * real draw, which rolls its own randomness.
 */
export class DrawSimulation {
	constructor(
		readonly tiers: readonly DrawTier[],
		readonly spots: number,
		private readonly random: () => number = Math.random,
	) {}

	get entries(): number {
		return this.tiers.reduce((sum, tier) => sum + tier.entries, 0);
	}

	/** The chance of a number if every entry held the same odds. */
	get evenChance(): number {
		return this.entries === 0 ? 0 : Math.min(1, this.spots / this.entries);
	}

	/** How many entries in each tier get a number in one rehearsal. */
	draw(): number[] {
		const keys = this.tiers.flatMap((tier, index) =>
			Array.from({ length: tier.entries }, () => ({
				key: this.random() ** (1 / Math.max(1, tier.weight)),
				index,
			})),
		);
		const placed = this.tiers.map(() => 0);

		keys.sort((a, b) => b.key - a.key);

		for (const { index } of keys.slice(0, this.spots)) {
			placed[index]! += 1;
		}

		return placed;
	}

	/** The average number placed from each tier, over many rehearsals. */
	expectedPlaced(runs = 600): number[] {
		const totals = this.tiers.map(() => 0);

		for (let run = 0; run < runs; run += 1) {
			this.draw().forEach((placed, index) => {
				totals[index]! += placed;
			});
		}

		return totals.map((total) => total / runs);
	}

	/** The places raised entries gain over what even odds would give them. */
	placesMoved(expected: readonly number[] = this.expectedPlaced()): number {
		return this.tiers.reduce(
			(moved, tier, index) =>
				tier.weight > 1 ? moved + (expected[index] ?? 0) - tier.entries * this.evenChance : moved,
			0,
		);
	}
}
