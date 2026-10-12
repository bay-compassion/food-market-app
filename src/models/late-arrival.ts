/**
 * How long a called guest has kept the check-in desk waiting, and how pressing that has become.
 *
 * A called guest's turn never expires — they can come up any time until the market closes — but
 * others are waiting behind them, and the card should say so with some weight. So the measure is
 * time since the call, the same clock the queue desk shows a worker ("called 4 min ago"), not how
 * many numbers have been called since: a batch can call five in a moment, and a lull can take ten
 * minutes over one.
 *
 * Built from the visit's `calledAt`, and free of MobX and the DOM; the card asks it about `now`.
 */
export class LateArrival {
	/** How long a called guest has to reach the desk before their board starts to warm. */
	static readonly graceMs = 3 * 60_000;

	/** How much longer, after the grace, until it is fully yellow. */
	static readonly rampMs = 7 * 60_000;

	constructor(private readonly calledAt: Date) {}

	/** Milliseconds since the call, never negative — a phone's clock can run a little behind. */
	elapsedMs(now: number): number {
		return Math.max(0, now - this.calledAt.valueOf());
	}

	/** Whole minutes since the call, as a person would say it. */
	minutesSince(now: number): number {
		return Math.floor(this.elapsedMs(now) / 60_000);
	}

	/**
	 * How far the guest's board has warmed toward yellow, `0`–`1`: `0` through the grace, then an
	 * ease-in — squared progress, so it moves faster the longer they are gone — reaching `1` at
	 * `graceMs + rampMs`, and holding there.
	 */
	warmthAt(now: number): number {
		const progress = (this.elapsedMs(now) - LateArrival.graceMs) / LateArrival.rampMs;

		return Math.min(1, Math.max(0, progress)) ** 2;
	}

	/** Fully yellow: the card now says, in words, that others are waiting behind them. */
	isLateAt(now: number): boolean {
		return this.warmthAt(now) >= 1;
	}
}
