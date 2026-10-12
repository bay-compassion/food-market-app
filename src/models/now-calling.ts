import { QueueNumber } from './queue-number.ts';

/** What a waiting guest's phone is told about the numbers being called. */
export type NowCallingState = {
	/** The highest main-series number called this session, or `null` before the first. */
	nowCalling: number | null;
	/** Priority numbers (`P1`, …) called and not yet at the table, most recently called first. */
	calledPriority: number[];
};

/**
 * The "now calling" row on a waiting guest's card: the main number the market has reached, for the
 * guest to compare with their own, and any priority numbers at the entrance beside it.
 *
 * The main number only counts up, so it stays the thing to compare against; a priority number
 * counts on its own and is shown beside it rather than in its place.
 */
export class NowCalling {
	constructor(private readonly state: NowCallingState) {}

	/** The main number being called, or `null` before any has been. */
	get main(): QueueNumber | null {
		return this.state.nowCalling === null ? null : QueueNumber.main(this.state.nowCalling);
	}

	/** Priority numbers being called, in counting order. */
	get priority(): QueueNumber[] {
		return this.state.calledPriority
			.map((value) => QueueNumber.priority(value))
			.toSorted(QueueNumber.compare);
	}

	/** Nobody has been called yet, in either series. */
	get isEmpty(): boolean {
		return this.main === null && this.priority.length === 0;
	}
}
