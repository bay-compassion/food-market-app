import { DateTime, IANAZone } from 'luxon';

/** A calendar date with no time zone, as `YYYY-MM-DD`. */
export type LocalDate = string;

/** A wall-clock time with no time zone, as `HH:mm` (a trailing `:ss` is accepted and ignored). */
export type LocalTime = string;

export type MarketLocationRecord = {
	id: string;
	name: string;
	/** An IANA time zone name, such as `America/Los_Angeles`. */
	timeZone: string;
};

const minuteMs = 60_000;
const dayMs = 24 * 60 * minuteMs;
const displayLocale = 'en-US';

/**
 * Where a market happens, and the time zone every local date and time there is read in.
 *
 * Instants are stored and compared as `Date`s; this class is the one place that turns a location's
 * calendar date and wall-clock time into an instant and back, so daylight saving time is handled
 * once rather than wherever a time is shown or entered.
 */
export class MarketLocation {
	readonly id: string;
	readonly name: string;
	readonly timeZone: string;
	private readonly zone: IANAZone;

	constructor(record: MarketLocationRecord) {
		const zone = IANAZone.create(record.timeZone);

		if (!zone.isValid) {
			throw new RangeError(`Unknown time zone: ${record.timeZone}`);
		}

		this.id = record.id;
		this.name = record.name;
		this.timeZone = record.timeZone;
		this.zone = zone;
	}

	/** The calendar date an instant falls on at this location. */
	localDateOf(instant: Date): LocalDate {
		return DateTime.fromJSDate(instant, { zone: this.zone }).toISODate()!;
	}

	/**
	 * The instant a local date and time names at this location.
	 *
	 * Twice a year that is not a single instant. A time skipped by the spring-forward gap moves
	 * forward by the length of the gap (2:30 becomes 3:30). A time repeated by the fall-back
	 * overlap resolves to its first occurrence. Both rules are applied explicitly here rather than
	 * left to a library default.
	 */
	instantAt(date: LocalDate, time: LocalTime): Date {
		const wallClock = DateTime.fromISO(`${date}T${normalizeTime(time)}`, { zone: 'utc' });

		if (!wallClock.isValid) {
			throw new RangeError(`Invalid local date or time: ${date} ${time}`);
		}

		const wallMs = wallClock.toMillis();
		const offsetBefore = this.zone.offset(wallMs - dayMs);
		const offsetAfter = this.zone.offset(wallMs + dayMs);
		const candidates = [offsetBefore, offsetAfter]
			.map((offset) => wallMs - offset * minuteMs)
			.filter((instant) => this.zone.offset(instant) * minuteMs === wallMs - instant)
			.sort((first, second) => first - second);

		// No offset reproduces the wall-clock time: it falls in the spring-forward gap. Reading it
		// with the offset in force before the gap lands the same distance past the transition.
		return new Date(candidates[0] ?? wallMs - offsetBefore * minuteMs);
	}

	/** The ISO weekday of a local date: 1 is Monday, 7 is Sunday. */
	weekdayOf(date: LocalDate): number {
		return DateTime.fromISO(date, { zone: 'utc' }).weekday;
	}

	/** `Sat, Sep 26` for an instant at this location, or for a local date. */
	formatDate(value: Date | LocalDate): string {
		const date =
			typeof value === 'string'
				? DateTime.fromISO(value, { zone: 'utc' })
				: DateTime.fromJSDate(value, { zone: this.zone });

		return date.setLocale(displayLocale).toFormat('ccc, LLL d');
	}

	/** `Sep 19, 2026` for a local date. */
	formatLongDate(date: LocalDate): string {
		return DateTime.fromISO(date, { zone: 'utc' }).setLocale(displayLocale).toFormat('LLL d, yyyy');
	}

	/** `10:30 AM` for an instant at this location. */
	formatTime(instant: Date): string {
		return DateTime.fromJSDate(instant, { zone: this.zone })
			.setLocale(displayLocale)
			.toFormat('h:mm a');
	}

	/** The local date `days` calendar days after `date` (or before, when negative). */
	static addDays(date: LocalDate, days: number): LocalDate {
		return DateTime.fromISO(date, { zone: 'utc' }).plus({ days }).toISODate()!;
	}

	/** Whole calendar days from `from` to `to`; negative when `to` is earlier. */
	static daysBetween(from: LocalDate, to: LocalDate): number {
		return Math.round(
			DateTime.fromISO(to, { zone: 'utc' }).diff(DateTime.fromISO(from, { zone: 'utc' }), 'days')
				.days,
		);
	}
}

function normalizeTime(time: LocalTime): string {
	return time.slice(0, 5);
}
