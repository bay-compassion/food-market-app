import { describe, expect, it } from 'vitest';

import { translations } from '../locales';
import { CalendarInvite } from './calendar-invite';
import { NextRegistration } from './next-registration';

const window = {
	registrationOpensAt: '2026-10-31T17:30:00.000Z',
	registrationClosesAt: '2026-10-31T17:45:00.000Z',
	timeZone: 'America/Los_Angeles',
};

function invite(title: string) {
	return new CalendarInvite(
		{
			startsAt: new Date(window.registrationOpensAt),
			endsAt: new Date(window.registrationClosesAt),
			title,
			url: 'https://market.example',
		},
		new Date('2026-10-29T12:00:00.000Z'),
	);
}

describe('CalendarInvite', () => {
	it('writes the window in UTC with a reminder ahead of it', () => {
		// Arrange
		const event = invite('Register for The Bay Compassion market');

		// Act
		const lines = event.ics.split('\r\n');

		// Assert
		expect(lines).toContain('DTSTART:20261031T173000Z');
		expect(lines).toContain('DTEND:20261031T174500Z');
		expect(lines).toContain('DTSTAMP:20261029T120000Z');
		expect(lines).toContain('SUMMARY:Register for The Bay Compassion market');
		expect(lines).toContain('TRIGGER:-PT10M');
		expect(event.ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
	});

	it('escapes the characters iCalendar reserves', () => {
		// Arrange
		const event = invite('Shop, then; rest');

		// Act
		const { ics } = event;

		// Assert
		expect(ics).toContain('SUMMARY:Shop\\, then\\; rest');
	});

	it('folds a long line without splitting a character', () => {
		// Arrange
		const event = invite(translations.fa.guestView.notOpenState.calendarEventTitle.repeat(3));
		const encoder = new TextEncoder();

		// Act
		const lines = event.ics.split('\r\n');

		// Assert
		expect(lines.every((line) => encoder.encode(line).length <= 75)).toBe(true);
		expect(event.ics).not.toContain('�');
		expect(event.ics.replace(/\r\n /g, '')).toContain(
			`SUMMARY:${translations.fa.guestView.notOpenState.calendarEventTitle.repeat(3)}`,
		);
	});
});

describe('NextRegistration.invite', () => {
	it('offers an invite only for a dated window', () => {
		// Arrange
		const dated = new NextRegistration(window);

		// Act
		const datedInvite = dated.invite('Register', 'https://market.example');
		const undatedInvite = NextRegistration.every.invite('Register', 'https://market.example');

		// Assert
		expect(datedInvite?.ics).toContain('DTSTART:20261031T173000Z');
		expect(undatedInvite).toBeNull();
	});
});
