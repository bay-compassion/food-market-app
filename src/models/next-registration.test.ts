import { describe, expect, it } from 'vitest';

import { translations } from '../locales';
import { NextRegistration } from './next-registration';

/** Saturday, October 31, 2026, 10:30–10:45 AM in the market's time zone. */
const saturday = new NextRegistration({
	registrationOpensAt: '2026-10-31T17:30:00.000Z',
	registrationClosesAt: '2026-10-31T17:45:00.000Z',
	timeZone: 'America/Los_Angeles',
});
const phrases = translations.en.guestView.nextRegistration;
const sentence = 'Registration opens again {when} for {minutes} minutes, until {closeTime}.';

describe('NextRegistration', () => {
	it.each([
		['the morning of', '2026-10-31T15:00:00.000Z', 'today at 10:30 AM'],
		[
			'the day before',
			'2026-10-30T19:00:00.000Z',
			'tomorrow, on Saturday, October 31, at 10:30 AM',
		],
		[
			'the Sunday before',
			'2026-10-25T19:00:00.000Z',
			'in 6 days, on Saturday, October 31, at 10:30 AM',
		],
	])('tells the day %s with the date and a relative day', (_when, now, expected) => {
		// Act
		const text = saturday.fill('{when}', phrases, 'en', new Date(now));

		// Assert
		expect(text).toBe(expected);
	});

	it('counts days in the market’s time zone, not UTC', () => {
		// Arrange: 11 PM Friday in California, already Saturday in UTC.
		const fridayNight = new Date('2026-10-31T06:00:00.000Z');

		// Act
		const days = saturday.daysUntil(fridayNight);

		// Assert
		expect(days).toBe(1);
	});

	it('fills in how long registration stays open and when it closes', () => {
		// Act
		const text = saturday.fill(sentence, phrases, 'en', new Date('2026-10-31T15:00:00.000Z'));

		// Assert
		expect(text).toBe('Registration opens again today at 10:30 AM for 15 minutes, until 10:45 AM.');
	});

	it.each([
		['the guides', NextRegistration.next, 'next Saturday at 10:30 AM'],
		['a market with no schedule', NextRegistration.every, 'every Saturday at 10:30 AM'],
	])('names no date for %s', (_for, next, expected) => {
		// Act
		const text = next.fill('{when}', phrases, 'en', new Date());

		// Assert
		expect(text).toBe(expected);
	});

	it('writes Farsi in Persian digits and the Gregorian calendar', () => {
		// Act
		const text = saturday.fill(
			'{when}',
			translations.fa.guestView.nextRegistration,
			'fa',
			new Date('2026-10-28T19:00:00.000Z'),
		);

		// Assert
		expect(text).toContain('۳۱ اکتبر');
		expect(text).toContain('۱۰:۳۰');
	});

	it('leaves no placeholder unfilled in any language', () => {
		for (const [locale, copy] of Object.entries(translations)) {
			// Act
			const text = saturday.fill(
				copy.guestView.serviceState.inProgressDescription,
				copy.guestView.nextRegistration,
				locale,
				new Date('2026-10-28T19:00:00.000Z'),
			);

			// Assert
			expect(text, locale).not.toMatch(/[{}]/);
		}
	});

	describe('headline', () => {
		const headlinePhrases = {
			undatedDay: 'Every Saturday',
			opensDated: 'Opens {relative} at {time}',
			opensUndated: 'Opens at {time}',
		};

		it.each([
			['the morning of', '2026-10-31T15:00:00.000Z', 'Opens today at 10:30 AM'],
			['the day before', '2026-10-30T19:00:00.000Z', 'Opens tomorrow at 10:30 AM'],
			['the Sunday before', '2026-10-25T19:00:00.000Z', 'Opens in 6 days at 10:30 AM'],
		])('tells the date apart from when it opens, %s', (_when, now, opens) => {
			// Act
			const headline = saturday.headline(headlinePhrases, 'en', new Date(now));

			// Assert
			expect(headline).toEqual({ day: 'Saturday, October 31', opens });
		});

		it('falls back to the usual Saturday when the schedule names no date', () => {
			// Act
			const headline = NextRegistration.every.headline(headlinePhrases, 'en', new Date());

			// Assert
			expect(headline).toEqual({ day: 'Every Saturday', opens: 'Opens at 10:30 AM' });
		});
	});
});
