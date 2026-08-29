import type { SessionEvent } from '../stores/market-session.store.ts';
import type { SessionMode } from './sessionStateMachine.ts';

/** The registration settings the session view edits before a session opens. */
export type SessionSettings = {
	sessionMode: SessionMode;
	registrationOpensAt: string;
	adHocClosesAt: string;
	durationMinutes: number;
	capacity: number;
};

const defaultCapacity = 50;
const defaultDurationMinutes = 60;
const schedulingGranularityMinutes = 15;
const minuteMs = 60_000;

/**
 * Formats an instant for a `datetime-local` input, which has no time zone and reads whatever it
 * is given as local wall-clock time. Shifting by the offset before serialising is what makes the
 * round trip through `new Date(value)` land back on the same instant.
 */
export function toLocalDateTimeInput(value: string | Date): string {
	const date = new Date(value);

	return new Date(date.valueOf() - date.getTimezoneOffset() * minuteMs).toISOString().slice(0, 16);
}

/**
 * Settings for a session that does not exist yet: opening at the next quarter hour, running for an
 * hour. Rounding up to the next slot keeps the prefilled time from being one already in the past
 * by the time a worker gets to the save button.
 */
export function defaultSessionSettings(now: Date = new Date()): SessionSettings {
	const opens = new Date(now);

	opens.setMinutes(
		Math.ceil(opens.getMinutes() / schedulingGranularityMinutes) * schedulingGranularityMinutes,
		0,
		0,
	);

	if (opens <= now) {
		opens.setMinutes(opens.getMinutes() + schedulingGranularityMinutes);
	}

	return {
		sessionMode: 'scheduled',
		registrationOpensAt: toLocalDateTimeInput(opens),
		adHocClosesAt: toLocalDateTimeInput(
			new Date(opens.valueOf() + defaultDurationMinutes * minuteMs),
		),
		durationMinutes: defaultDurationMinutes,
		capacity: defaultCapacity,
	};
}

/** The settings that describe a session already on the server, for editing it. */
export function settingsFromEvent(event: SessionEvent): SessionSettings {
	const opensAt = new Date(event.registrationOpensAt);
	const closesAt = new Date(event.registrationClosesAt);

	return {
		sessionMode: event.sessionMode ?? 'scheduled',
		registrationOpensAt: toLocalDateTimeInput(opensAt),
		adHocClosesAt: toLocalDateTimeInput(closesAt),
		// A session that somehow closes before it opens would otherwise render a negative duration
		// in the form; one minute is the shortest thing the field can honestly say.
		durationMinutes: Math.max(1, Math.round((closesAt.valueOf() - opensAt.valueOf()) / minuteMs)),
		capacity: event.capacity,
	};
}

/**
 * When registration opens, as an instant. An ad hoc session opens the moment it is saved; a
 * scheduled one opens at the time the form holds.
 */
export function registrationOpensAtFrom(settings: SessionSettings, now: Date = new Date()): string {
	return settings.sessionMode === 'ad_hoc'
		? now.toISOString()
		: new Date(settings.registrationOpensAt).toISOString();
}

/**
 * When registration closes, as an instant. An ad hoc session names its closing time directly; a
 * scheduled one derives it from the opening time and the duration.
 */
export function registrationClosesAtFrom(settings: SessionSettings): string {
	if (settings.sessionMode === 'ad_hoc') {
		return new Date(settings.adHocClosesAt).toISOString();
	}

	return new Date(
		new Date(settings.registrationOpensAt).valueOf() + settings.durationMinutes * minuteMs,
	).toISOString();
}
