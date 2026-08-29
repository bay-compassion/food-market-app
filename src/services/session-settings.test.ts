import { describe, expect, it } from 'vitest';

import type { SessionEvent } from '../stores/market-session.store';
import {
	defaultSessionSettings,
	registrationClosesAtFrom,
	registrationOpensAtFrom,
	settingsFromEvent,
	toLocalDateTimeInput,
	type SessionSettings,
} from './session-settings';

function eventWith(overrides: Partial<SessionEvent> = {}): SessionEvent {
	return {
		id: 'event-1',
		registrationOpensAt: '2026-03-01T17:00:00.000Z',
		registrationClosesAt: '2026-03-01T18:30:00.000Z',
		capacity: 40,
		sessionMode: 'scheduled',
		status: 'scheduled',
		...overrides,
	} as SessionEvent;
}

describe('toLocalDateTimeInput', () => {
	it('round-trips through the value a datetime-local input reads back', () => {
		// Arrange
		const instant = new Date('2026-03-01T17:23:00.000Z');

		// Act
		const formatted = toLocalDateTimeInput(instant);

		// Assert
		expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
		// Seconds are outside the field's resolution, so the round trip lands on the same minute.
		expect(new Date(formatted).valueOf()).toBe(instant.valueOf());
	});
});

describe('defaultSessionSettings', () => {
	it('opens at the next quarter hour', () => {
		// Arrange
		const now = new Date('2026-03-01T10:07:30.000Z');

		// Act
		const settings = defaultSessionSettings(now);

		// Assert
		expect(new Date(settings.registrationOpensAt).getMinutes()).toBe(15);
		expect(new Date(settings.registrationOpensAt).valueOf()).toBeGreaterThan(now.valueOf());
	});

	it('moves to the following slot when the current time is already on one', () => {
		// Arrange
		const now = new Date('2026-03-01T10:30:00.000Z');

		// Act
		const settings = defaultSessionSettings(now);

		// Assert
		expect(new Date(settings.registrationOpensAt).valueOf()).toBe(now.valueOf() + 15 * 60_000);
	});

	it('runs for an hour by default', () => {
		// Arrange
		const now = new Date('2026-03-01T10:07:00.000Z');

		// Act
		const settings = defaultSessionSettings(now);

		// Assert
		expect(settings.durationMinutes).toBe(60);
		expect(settings.sessionMode).toBe('scheduled');
		expect(new Date(settings.adHocClosesAt).valueOf()).toBe(
			new Date(settings.registrationOpensAt).valueOf() + 60 * 60_000,
		);
	});
});

describe('settingsFromEvent', () => {
	it('derives the duration from the event window', () => {
		// Arrange
		const event = eventWith();

		// Act
		const settings = settingsFromEvent(event);

		// Assert
		expect(settings.durationMinutes).toBe(90);
		expect(settings.capacity).toBe(40);
		expect(settings.sessionMode).toBe('scheduled');
	});

	it('never reports a duration below a minute', () => {
		// Arrange — a session whose window is inverted would otherwise render as negative.
		const event = eventWith({
			registrationOpensAt: '2026-03-01T18:00:00.000Z',
			registrationClosesAt: '2026-03-01T17:00:00.000Z',
		});

		// Act
		const settings = settingsFromEvent(event);

		// Assert
		expect(settings.durationMinutes).toBe(1);
	});
});

describe('registrationOpensAtFrom', () => {
	it('opens an ad hoc session immediately', () => {
		// Arrange
		const now = new Date('2026-03-01T12:00:00.000Z');
		const settings = { ...defaultSessionSettings(now), sessionMode: 'ad_hoc' } as SessionSettings;

		// Act
		const opensAt = registrationOpensAtFrom(settings, now);

		// Assert
		expect(opensAt).toBe(now.toISOString());
	});

	it('opens a scheduled session at the time on the form', () => {
		// Arrange
		const now = new Date('2026-03-01T12:00:00.000Z');
		const settings = defaultSessionSettings(now);

		// Act
		const opensAt = registrationOpensAtFrom(settings, now);

		// Assert
		expect(opensAt).toBe(new Date(settings.registrationOpensAt).toISOString());
	});
});

describe('registrationClosesAtFrom', () => {
	it('closes an ad hoc session at the time it names', () => {
		// Arrange
		const settings = {
			...defaultSessionSettings(new Date('2026-03-01T12:00:00.000Z')),
			sessionMode: 'ad_hoc',
		} as SessionSettings;

		// Act
		const closesAt = registrationClosesAtFrom(settings);

		// Assert
		expect(closesAt).toBe(new Date(settings.adHocClosesAt).toISOString());
	});

	it('closes a scheduled session one duration after it opens', () => {
		// Arrange
		const settings: SessionSettings = {
			...defaultSessionSettings(new Date('2026-03-01T12:00:00.000Z')),
			durationMinutes: 45,
		};

		// Act
		const closesAt = registrationClosesAtFrom(settings);

		// Assert
		expect(new Date(closesAt).valueOf()).toBe(
			new Date(settings.registrationOpensAt).valueOf() + 45 * 60_000,
		);
	});
});
