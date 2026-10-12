/** The two number columns a visit carries; at most one of them is set. */
export type QueueNumberSource = {
	queuePosition: number | null;
	priorityNumber: number | null;
};

/** Which run of numbers a queue number belongs to. */
export type QueueNumberSeries = 'main' | 'priority';

/**
 * The number a guest carries through the day — on their phone, in their text, on their name tag —
 * as `42` in the main series or `P1` in the priority series, which is what a worker gives a guest
 * they put at the front ahead of others.
 *
 * A number never changes once given; where the guest stands in line is a separate matter, held in
 * the visit's line order. The priority series counts on its own, so the main numbers keep rising
 * in step with the line and a waiting guest can compare theirs with the one being called.
 *
 * A value object, free of MobX and the DOM: the server, the guest's phone, the queue desk, and the
 * kiosk all format a number through it.
 */
export class QueueNumber {
	/** The letter that marks the priority series. Kept in Latin script in every language. */
	static readonly priorityPrefix = 'P';

	private constructor(
		readonly series: QueueNumberSeries,
		readonly value: number,
	) {}

	/**
	 * The visit's number, or `null` for a visit that has none yet (before the draw, say). Checked by
	 * type rather than against `null`: a response from a build older than the priority series has
	 * no `priorityNumber` at all, and reading that as a number would show the guest `Pundefined`.
	 */
	static of(source: QueueNumberSource): QueueNumber | null {
		if (typeof source.priorityNumber === 'number') {
			return new QueueNumber('priority', source.priorityNumber);
		}

		return typeof source.queuePosition === 'number'
			? new QueueNumber('main', source.queuePosition)
			: null;
	}

	static main(value: number): QueueNumber {
		return new QueueNumber('main', value);
	}

	static priority(value: number): QueueNumber {
		return new QueueNumber('priority', value);
	}

	get isPriority(): boolean {
		return this.series === 'priority';
	}

	/** `42`, or `P1`. */
	get label(): string {
		return this.format(String);
	}

	/**
	 * The label with its digits written by `digits` — the kiosk passes a language's own numerals,
	 * so a priority number reads `P۱` for a guest who reads Persian digits.
	 */
	format(digits: (value: number) => string): string {
		return this.isPriority
			? `${QueueNumber.priorityPrefix}${digits(this.value)}`
			: digits(this.value);
	}

	/** The columns this number is stored in. */
	toSource(): QueueNumberSource {
		return this.isPriority
			? { queuePosition: null, priorityNumber: this.value }
			: { queuePosition: this.value, priorityNumber: null };
	}

	/** The number as a visit's history records it. */
	toDetails(): { queuePosition: number } | { priorityNumber: number } {
		return this.isPriority ? { priorityNumber: this.value } : { queuePosition: this.value };
	}

	equals(other: QueueNumber | null): boolean {
		return other !== null && other.series === this.series && other.value === this.value;
	}

	/**
	 * Main numbers first, each series in counting order: the order a list of numbers reads in when
	 * it is not the line's order — the kiosk's tiles, a guest's row of numbers being called.
	 */
	static compare(this: void, first: QueueNumber, second: QueueNumber): number {
		if (first.series !== second.series) {
			return first.isPriority ? 1 : -1;
		}

		return first.value - second.value;
	}
}
