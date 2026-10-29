/** When registration next opens, as `/api/market` reports it. */
export type NextRegistrationWindow = {
	registrationOpensAt: string;
	registrationClosesAt: string;
	/** The market's IANA time zone, which the day and times are told in. */
	timeZone: string;
};

/** The phrases a sentence's `{when}` is built from, in one language. */
export type NextRegistrationPhrases = {
	/** `{time}`: registration opens later today. */
	today: string;
	/** `{relative}` (tomorrow, in 3 days…), `{date}` and `{time}`: any later day. */
	dated: string;
	/**
	 * `{time}`, "next Saturday": for the guides and videos, which are watched on any day of the week
	 * and must not name a date that has passed.
	 */
	next: string;
	/** `{time}`, "every Saturday": for a market with no schedule to say which Saturday is next. */
	every: string;
};

/** Which phrase tells the day: a date from the schedule, or one of the dateless ones. */
export type NextRegistrationTelling = 'dated' | 'next' | 'every';

const dayMs = 86_400_000;

/** The usual Saturday window, 10:30–10:45 AM, whose times the dateless phrases tell. */
const usualWindow: NextRegistrationWindow = {
	registrationOpensAt: '2026-10-31T17:30:00.000Z',
	registrationClosesAt: '2026-10-31T17:45:00.000Z',
	timeZone: 'America/Los_Angeles',
};

/**
 * When registration next opens, told so a guest can't misread it: always with the date, and with a
 * relative day — today, tomorrow, in 3 days — rather than the "this Saturday" or "next Saturday"
 * that people read a day or a week apart. Fills a sentence's `{when}`, `{minutes}` and `{closeTime}`.
 *
 * Plain `Intl`, no date library: it is read on the guest's first screen. Days and times are told in
 * the market's time zone and the Gregorian calendar (Farsi would otherwise default to the Persian
 * one), in the digits each language's copy already uses.
 */
export class NextRegistration {
	/** The usual Saturday as the guides tell it: "next Saturday", whatever day they are watched. */
	static readonly next = new NextRegistration(usualWindow, { telling: 'next' });

	/** The usual Saturday for a market with no schedule, which can't say which one is next. */
	static readonly every = new NextRegistration(usualWindow, { telling: 'every' });

	private readonly opensAt: Date;
	private readonly closesAt: Date;
	private readonly timeZone: string;
	readonly telling: NextRegistrationTelling;

	constructor(
		window: NextRegistrationWindow,
		{ telling = 'dated' }: { telling?: NextRegistrationTelling } = {},
	) {
		this.opensAt = new Date(window.registrationOpensAt);
		this.closesAt = new Date(window.registrationClosesAt);
		this.timeZone = window.timeZone;
		this.telling = telling;
	}

	/** How long registration stays open, in whole minutes. */
	get durationMinutes(): number {
		return Math.round((this.closesAt.valueOf() - this.opensAt.valueOf()) / 60_000);
	}

	/** Calendar days from `now` to opening in the market's time zone: 0 today, 1 tomorrow. */
	daysUntil(now: Date): number {
		return Math.round((this.localDay(this.opensAt) - this.localDay(now)) / dayMs);
	}

	/** `template` with its `{when}`, `{minutes}` and `{closeTime}` filled in. */
	fill(template: string, phrases: NextRegistrationPhrases, locale: string, now: Date): string {
		return template
			.replace('{when}', this.when(phrases, locale, now))
			.replace(
				'{minutes}',
				new Intl.NumberFormat(locale, { numberingSystem: digitsOf(locale) }).format(
					this.durationMinutes,
				),
			)
			.replace('{closeTime}', this.time(this.closesAt, locale));
	}

	private when(phrases: NextRegistrationPhrases, locale: string, now: Date): string {
		const time = this.time(this.opensAt, locale);

		if (this.telling !== 'dated') {
			return phrases[this.telling].replace('{time}', time);
		}

		const days = this.daysUntil(now);

		if (days <= 0) {
			return phrases.today.replace('{time}', time);
		}

		// The digits go in as a locale extension, which every browser takes, rather than an option.
		const relative = new Intl.RelativeTimeFormat(`${locale}-u-nu-${digitsOf(locale)}`, {
			numeric: 'auto',
		}).format(days, 'day');

		return phrases.dated
			.replace('{relative}', lowerFirst(relative, locale))
			.replace(
				'{date}',
				this.format(this.opensAt, locale, { weekday: 'long', month: 'long', day: 'numeric' }),
			)
			.replace('{time}', time);
	}

	private time(at: Date, locale: string): string {
		return this.format(at, locale, { timeStyle: 'short' });
	}

	private format(at: Date, locale: string, options: Intl.DateTimeFormatOptions): string {
		return new Intl.DateTimeFormat(intlLocaleOf(locale), {
			...options,
			timeZone: this.timeZone,
			calendar: 'gregory',
			numberingSystem: digitsOf(locale),
		}).format(at);
	}

	/** Midnight UTC of `at`'s calendar date in the market's time zone, for counting whole days. */
	private localDay(at: Date): number {
		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone: this.timeZone,
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
		}).formatToParts(at);
		const part = (type: Intl.DateTimeFormatPartTypes) =>
			Number(parts.find((p) => p.type === type)?.value);

		return Date.UTC(part('year'), part('month') - 1, part('day'));
	}
}

/**
 * The `Intl` locale a language's dates and times are told in. Spanish takes its US form, whose
 * "10:30 a.m." matches the market's copy where plain Spanish would say "10:30".
 */
function intlLocaleOf(locale: string): string {
	return locale === 'es' ? 'es-US' : locale;
}

/** Farsi copy is written in Persian digits; every other language, Arabic included, in Latin ones. */
function digitsOf(locale: string): string {
	return locale === 'fa' ? 'arabext' : 'latn';
}

/** The relative day sits mid-sentence, where Vietnamese's capitalized "Ngày mai" would not. */
function lowerFirst(text: string, locale: string): string {
	return text.charAt(0).toLocaleLowerCase(locale) + text.slice(1);
}
