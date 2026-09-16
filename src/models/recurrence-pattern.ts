import { DateTime } from 'luxon';

import { MarketLocation, type LocalDate, type LocalTime } from './market-location.ts';

export type RecurrencePatternRecord = {
	id: string;
	/** The first date the pattern occurs on. It repeats weekly on this date's weekday. */
	startsOn: LocalDate;
	/** When registration opens on each occurrence, in the location's wall-clock time. */
	registrationOpensAt: LocalTime;
	registrationDurationMinutes: number;
	capacity: number;
	lotteryDelayMinutes: number | null;
	autoCloseAfterMinutes: number | null;
};

/** One date the pattern produces, with its registration window as instants. */
export type Occurrence = {
	date: LocalDate;
	registrationOpensAt: Date;
	registrationClosesAt: Date;
};

/** Everything a new session row needs from the pattern for one occurrence. */
export type PatternSessionValues = Occurrence & {
	locationId: string;
	recurrencePatternId: string;
	capacity: number;
	lotteryDelayMinutes: number | null;
	autoCloseAfterMinutes: number | null;
};

const minuteMs = 60_000;
const daysPerWeek = 7;

/**
 * A market's weekly schedule: it occurs every week on the weekday of `startsOn`, from that date
 * onward, until it is deleted.
 *
 * Built from a stored pattern and the location whose time zone its local times are read in.
 * Occurrences are calculated, never stored — only the next one ever becomes a session.
 */
export class RecurrencePattern {
	constructor(
		private readonly record: RecurrencePatternRecord,
		readonly location: MarketLocation,
	) {}

	get id(): string {
		return this.record.id;
	}

	get startsOn(): LocalDate {
		return this.record.startsOn;
	}

	get registrationOpensAt(): LocalTime {
		return this.record.registrationOpensAt.slice(0, 5);
	}

	get registrationDurationMinutes(): number {
		return this.record.registrationDurationMinutes;
	}

	get capacity(): number {
		return this.record.capacity;
	}

	get lotteryDelayMinutes(): number | null {
		return this.record.lotteryDelayMinutes;
	}

	get autoCloseAfterMinutes(): number | null {
		return this.record.autoCloseAfterMinutes;
	}

	/** The ISO weekday the pattern occurs on: 1 is Monday, 7 is Sunday. */
	get weekday(): number {
		return this.location.weekdayOf(this.startsOn);
	}

	/** "Every Saturday · from Sep 19, 2026". */
	get description(): string {
		const weekdayName = DateTime.fromISO(this.startsOn, { zone: 'utc' })
			.setLocale('en-US')
			.toFormat('cccc');

		return `Every ${weekdayName} · from ${this.location.formatLongDate(this.startsOn)}`;
	}

	/** Whether the pattern occurs on a local date. */
	occursOn(date: LocalDate): boolean {
		const days = MarketLocation.daysBetween(this.startsOn, date);

		return days >= 0 && days % daysPerWeek === 0;
	}

	/** The registration window of the occurrence on `date`, which must be one the pattern occurs on. */
	occurrenceOn(date: LocalDate): Occurrence {
		if (!this.occursOn(date)) {
			throw new RangeError(`The pattern does not occur on ${date}.`);
		}

		const registrationOpensAt = this.location.instantAt(date, this.registrationOpensAt);

		return {
			date,
			registrationOpensAt,
			registrationClosesAt: new Date(
				registrationOpensAt.valueOf() + this.registrationDurationMinutes * minuteMs,
			),
		};
	}

	/**
	 * The earliest occurrence whose registration opens strictly after `after`.
	 *
	 * Measured from the moment a session ends, this is what makes a session started early — on the
	 * Friday before its Saturday — produce that same Saturday again when it closes.
	 */
	nextOccurrence(after: Date): Occurrence {
		const afterDate = this.location.localDateOf(after);
		const daysFromStart = MarketLocation.daysBetween(this.startsOn, afterDate);
		const weeksAhead = Math.max(0, Math.ceil(daysFromStart / daysPerWeek));
		const candidate = this.occurrenceOn(
			MarketLocation.addDays(this.startsOn, weeksAhead * daysPerWeek),
		);

		return candidate.registrationOpensAt > after
			? candidate
			: this.occurrenceOn(MarketLocation.addDays(candidate.date, daysPerWeek));
	}

	/** Every local date the pattern occurs on from `from` to `to`, both inclusive. */
	occurrencesBetween(from: LocalDate, to: LocalDate): LocalDate[] {
		const daysFromStart = MarketLocation.daysBetween(this.startsOn, from);
		const weeksAhead = Math.max(0, Math.ceil(daysFromStart / daysPerWeek));
		const dates: LocalDate[] = [];

		for (
			let date = MarketLocation.addDays(this.startsOn, weeksAhead * daysPerWeek);
			MarketLocation.daysBetween(date, to) >= 0;
			date = MarketLocation.addDays(date, daysPerWeek)
		) {
			dates.push(date);
		}

		return dates;
	}

	/** The values a new session takes when it is created for the occurrence on `date`. */
	sessionValues(date: LocalDate): PatternSessionValues {
		return {
			...this.occurrenceOn(date),
			locationId: this.location.id,
			recurrencePatternId: this.id,
			capacity: this.capacity,
			lotteryDelayMinutes: this.lotteryDelayMinutes,
			autoCloseAfterMinutes: this.autoCloseAfterMinutes,
		};
	}
}
