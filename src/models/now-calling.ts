import { QueueNumber } from './queue-number.ts';

/** What a waiting guest's phone is told about the numbers being called. */
export type NowCallingState = {
	/** The highest main-series number called this session, or `null` before the first. */
	nowCalling: number | null;
	/** Main numbers called and not yet at the table, most recently called first. */
	called: number[];
	/** Priority numbers (`P1`, …) called and not yet at the table, most recently called first. */
	calledPriority: number[];
};

/** How far the line has moved past a called guest; see `NowCalling.urgencySince`. */
export type NowCallingUrgency = 'none' | 'recent' | 'behind' | 'wellBehind';

/**
 * The "now calling" row on a waiting guest's card, a small version of the room display: the main
 * number the market has reached, for the guest to compare with their own; the earlier numbers still
 * expected at the entrance, which is how a batch called at once shows up; and any priority numbers.
 *
 * The main number only counts up, so it stays the thing to compare against; a priority number
 * counts on its own and is shown beside it rather than in its place.
 */
export class NowCalling {
	/**
	 * How many earlier numbers the row shows beside the main one. A phone has room for a short
	 * batch; a longer list is the room display's job, and the oldest are the least useful.
	 */
	static readonly earlierLimit = 3;

	/** From this many numbers past theirs, a called guest is falling behind. */
	static readonly behindFrom = 3;

	/** From this many, well behind. */
	static readonly wellBehindFrom = 6;

	constructor(private readonly state: NowCallingState) {}

	/** The main number being called, or `null` before any has been. */
	get main(): QueueNumber | null {
		return this.state.nowCalling === null ? null : QueueNumber.main(this.state.nowCalling);
	}

	/**
	 * Main numbers called before the main one and still expected at the entrance — the rest of a
	 * batch, or a guest who has not come up yet — the most recent few, in counting order.
	 */
	get earlier(): QueueNumber[] {
		return this.state.called
			.filter((value) => value !== this.state.nowCalling)
			.slice(0, NowCalling.earlierLimit)
			.toSorted((first, second) => first - second)
			.map((value) => QueueNumber.main(value));
	}

	/** Priority numbers being called, in counting order. */
	get priority(): QueueNumber[] {
		return this.state.calledPriority
			.map((value) => QueueNumber.priority(value))
			.toSorted(QueueNumber.compare);
	}

	/**
	 * How many main numbers the market has called past `number` — how far the line has moved on
	 * since a called guest's turn, for one who is late or taking their time. `null` for a priority
	 * number, which counts on its own and so cannot be measured against the main series, and
	 * before any main number has been called.
	 */
	numbersSince(number: QueueNumber): number | null {
		const main = this.main;

		if (number.isPriority || main === null) {
			return null;
		}

		return Math.max(0, main.value - number.value);
	}

	/**
	 * How pressing `numbersSince` has become: `none` while the guest's own number is the one being
	 * called, `recent` for the first few, then `behind`, then `wellBehind`. The bands only colour the
	 * indicator — the market decides what happens to a late guest, not the card.
	 */
	urgencySince(number: QueueNumber): NowCallingUrgency {
		const since = this.numbersSince(number) ?? 0;

		if (since >= NowCalling.wellBehindFrom) {
			return 'wellBehind';
		}

		if (since >= NowCalling.behindFrom) {
			return 'behind';
		}

		return since > 0 ? 'recent' : 'none';
	}

	/** Nobody has been called yet, in either series. */
	get isEmpty(): boolean {
		return this.main === null && this.priority.length === 0;
	}
}
