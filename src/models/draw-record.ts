/** One draw a person went through, and what the draw gave everyone in it. */
export type DrawOutcome = {
	drawId: string;
	/** The share of that draw's entries that got a number: what even odds would have given anyone. */
	chance: number;
	won: boolean;
};

/**
 * A person's history in the draw, oldest first.
 *
 * Each draw counts at its own odds, because missing when 40 of 200 got a number says less than
 * missing when 180 of 200 did. So the expectation is a sum of per-draw chances, not `draws / 2`.
 */
export class DrawRecord {
	constructor(readonly outcomes: readonly DrawOutcome[]) {}

	get draws(): number {
		return this.outcomes.length;
	}

	get numbers(): number {
		return this.outcomes.filter((outcome) => outcome.won).length;
	}

	get missed(): number {
		return this.draws - this.numbers;
	}

	get missedInARow(): number {
		const lastWin = this.outcomes.map((outcome) => outcome.won).lastIndexOf(true);

		return this.draws - lastWin - 1;
	}

	/** The numbers even odds would have given this person by now. */
	get expectedNumbers(): number {
		return this.outcomes.reduce((sum, { chance }) => sum + chance, 0);
	}

	/** How far luck alone usually moves `numbers` from `expectedNumbers`, squared. */
	get variance(): number {
		return this.outcomes.reduce((sum, { chance }) => sum + chance * (1 - chance), 0);
	}

	/** This record as it stood before a draw, which is what that draw's own screen reads. */
	before(drawId: string): DrawRecord {
		const index = this.outcomes.findIndex((outcome) => outcome.drawId === drawId);

		return index === -1 ? this : new DrawRecord(this.outcomes.slice(0, index));
	}
}
