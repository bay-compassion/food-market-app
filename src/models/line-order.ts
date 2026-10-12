import type { QueuePlacement } from '../services/guestAdmission.ts';
import { QueueNumber, type QueueNumberSource } from './queue-number.ts';

/** Where a visit stands in its session's line: the two columns the line is sorted by. */
export type LineSlot = {
	/** Put at the front by a worker; called before everyone else. */
	queueFront: boolean;
	/** The order within `queueFront`. Null for a visit not in the line. */
	queueOrder: number | null;
};

/** Everything a visit is given when it joins the line: its number and its slot. */
export type LinePlacement = QueueNumberSource & LineSlot & { queueOrder: number };

/** What placing a guest needs to know about the session's line, read under the session's lock. */
export type LineState = {
	/** The highest number given in the main series this session, or `null` before the first. */
	highestNumber: number | null;
	/** The highest number given in the priority series this session, or `null` before the first. */
	highestPriorityNumber: number | null;
	/** The highest line order given this session, or `null` before the first. */
	highestOrder: number | null;
	/** How many guests are waiting, not counting the one being placed. */
	othersWaiting: number;
};

/**
 * The rules for where a guest goes in the line and which number they are given.
 *
 * A number, once given, is the guest's for the day; placing them only ever writes their slot. Main
 * numbers go to guests who join at the back — every lottery winner, and a worker's "add to the
 * end". A guest a worker puts at the front ahead of others gets the next priority number instead,
 * so nobody else's number moves, and the main numbers still rise in step with the line.
 *
 * Front-placed guests are called first come first served among themselves: the second guest put at
 * the front goes behind the first, not ahead of them.
 *
 * Built from a snapshot of the line rather than holding one, and free of the database, so the
 * rules are tested here and the server only reads and writes.
 */
export class LineOrder {
	constructor(private readonly line: LineState) {}

	private get nextOrder(): number {
		return (this.line.highestOrder ?? 0) + 1;
	}

	private get nextNumber(): number {
		return (this.line.highestNumber ?? 0) + 1;
	}

	private get nextPriorityNumber(): number {
		return (this.line.highestPriorityNumber ?? 0) + 1;
	}

	/**
	 * Places one guest: a new one a worker is adding, or one being returned to the queue, who keeps
	 * the number they already `hold`. With nobody else waiting, "next" and "end" are the same place,
	 * so a new guest gets a main number either way.
	 */
	place(placement: QueuePlacement, held: QueueNumber | null): LinePlacement {
		const queueFront = placement === 'next';
		const number =
			held ??
			(queueFront && this.line.othersWaiting > 0
				? QueueNumber.priority(this.nextPriorityNumber)
				: QueueNumber.main(this.nextNumber));

		return { ...number.toSource(), queueFront, queueOrder: this.nextOrder };
	}

	/**
	 * Places the lottery's winners, in the order drawn, behind anyone a worker already put in line:
	 * consecutive main numbers, consecutive orders.
	 */
	draw(count: number): LinePlacement[] {
		return Array.from({ length: count }, (_, index) => ({
			queuePosition: this.nextNumber + index,
			priorityNumber: null,
			queueFront: false,
			queueOrder: this.nextOrder + index,
		}));
	}

	/** Sorts visits into the order the line is called in; anyone not in the line goes last. */
	static compare(this: void, first: LineSlot, second: LineSlot): number {
		if (first.queueFront !== second.queueFront) {
			return first.queueFront ? -1 : 1;
		}

		return (
			(first.queueOrder ?? Number.MAX_SAFE_INTEGER) - (second.queueOrder ?? Number.MAX_SAFE_INTEGER)
		);
	}
}
