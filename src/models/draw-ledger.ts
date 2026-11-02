import { DrawRecord, type DrawOutcome } from './draw-record.ts';

export type LedgerDraw = { id: string; opensAt: Date };
export type LedgerEntry = { drawId: string; personId: string; won: boolean };

/**
 * Who went through which draw, per person rather than per guest record: one person holding two
 * records in a draw counts once, and got a number if either record did.
 */
export class DrawLedger {
	private readonly results = new Map<string, Map<string, boolean>>();

	/** `draws` run oldest first; a person's record reads in the same order. */
	constructor(
		readonly draws: readonly LedgerDraw[],
		entries: readonly LedgerEntry[],
	) {
		for (const { drawId, personId, won } of entries) {
			const results = this.results.get(drawId) ?? new Map<string, boolean>();

			results.set(personId, won || (results.get(personId) ?? false));
			this.results.set(drawId, results);
		}
	}

	get people(): string[] {
		return [...new Set([...this.results.values()].flatMap((results) => [...results.keys()]))];
	}

	/** The share of a draw's entries that got a number. */
	chanceOf(drawId: string): number {
		const results = [...(this.results.get(drawId)?.values() ?? [])];

		return results.length === 0 ? 0 : results.filter(Boolean).length / results.length;
	}

	entriesIn(drawId: string): number {
		return this.results.get(drawId)?.size ?? 0;
	}

	recordOf(personId: string): DrawRecord {
		const outcomes: DrawOutcome[] = this.draws.flatMap(({ id }) => {
			const won = this.results.get(id)?.get(personId);

			return won === undefined ? [] : [{ drawId: id, chance: this.chanceOf(id), won }];
		});

		return new DrawRecord(outcomes);
	}
}
