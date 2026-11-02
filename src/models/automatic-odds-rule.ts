/**
 * The rule automatic odds would follow. It is a preview: the draw records what this would have given
 * each guest, but nothing feeds it into the odds the draw uses. It only ever raises a guest, and it
 * reads misses in a row, never lateness or no-shows.
 */
export class AutomaticOddsRule {
	private static readonly firstRaiseAfter = 2;
	private static readonly secondRaiseAfter = 4;

	constructor(readonly topWeight = 3) {}

	weightFor(missedInARow: number): number {
		if (missedInARow >= AutomaticOddsRule.secondRaiseAfter) {
			return this.topWeight;
		}

		return missedInARow >= AutomaticOddsRule.firstRaiseAfter ? 2 : 1;
	}
}
