import { DateTime } from 'luxon';

export type PeriodKind = 'month' | 'quarter' | 'year';

export const periodKinds: readonly PeriodKind[] = ['month', 'quarter', 'year'];

/**
 * A calendar month, quarter, or year in the market's time zone — the windows a funder asks about.
 * A period holds the sessions whose registration opened inside it, as the Reports screen does.
 *
 * Uses Luxon, so only the server and lazily loaded code may import it.
 */
export class WarehousePeriod {
	private constructor(
		readonly kind: PeriodKind,
		private readonly first: DateTime,
	) {}

	static containing(kind: PeriodKind, instant: Date, timeZone: string): WarehousePeriod {
		return new WarehousePeriod(
			kind,
			DateTime.fromJSDate(instant, { zone: timeZone }).startOf(kind),
		);
	}

	/**
	 * Every period of this kind from the one holding `first` up to the last one that had settled by
	 * `now` — ended at least `settleDays` ago, so late-recorded visits are in.
	 */
	static settled(
		kind: PeriodKind,
		first: Date,
		now: Date,
		timeZone: string,
		settleDays: number,
	): WarehousePeriod[] {
		const periods: WarehousePeriod[] = [];

		for (
			let period = WarehousePeriod.containing(kind, first, timeZone);
			period.isSettledAt(now, settleDays);
			period = period.next
		) {
			periods.push(period);
		}

		return periods;
	}

	get start(): Date {
		return this.first.toJSDate();
	}

	/** Exclusive. */
	get end(): Date {
		return this.next.first.toJSDate();
	}

	get timeZone(): string {
		return this.first.zoneName!;
	}

	get next(): WarehousePeriod {
		return new WarehousePeriod(this.kind, this.first.plus({ [this.kind]: 1 }));
	}

	isSettledAt(now: Date, settleDays: number): boolean {
		return this.next.first.plus({ days: settleDays }).toMillis() <= now.getTime();
	}
}
