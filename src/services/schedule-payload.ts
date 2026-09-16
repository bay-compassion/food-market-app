import type { LocalDate, LocalTime } from '../models/market-location.ts';
import type { SessionStatus } from './sessionStateMachine.ts';

/**
 * The Schedule tab's wire format, shared by `netlify/routes/admin/schedule.mts` and the browser
 * client so the two cannot drift. Instants travel as ISO strings; a location's wall-clock dates and
 * times travel as plain local strings and are resolved against its time zone on the server.
 */

export type ScheduleQuestion = {
	prompt: string;
	type: 'text' | 'scale';
	required: boolean;
};

/** The settings a recurrence pattern and a single session have in common. */
export type SessionTemplate = {
	registrationOpensAt: LocalTime;
	registrationDurationMinutes: number;
	capacity: number;
	/** Minutes after the grace deadline the lottery draws on its own; null draws by hand. */
	lotteryDelayMinutes: number | null;
	/** Minutes after registration opens the session ends on its own; null never does. */
	autoCloseAfterMinutes: number | null;
	questions: ScheduleQuestion[];
};

/** What the pattern dialog sends. */
export type PatternInput = SessionTemplate & { startsOn: LocalDate };

/** What the one-off and edit-session dialogs send. */
export type SessionInput = SessionTemplate & { date: LocalDate };

export type ScheduleLocation = { id: string; name: string; timeZone: string };

export type SchedulePattern = PatternInput & { id: string };

export type ScheduleSessionPayload = {
	id: string;
	status: SessionStatus;
	/** Null for a one-off session. */
	recurrencePatternId: string | null;
	registrationOpensAt: string;
	registrationClosesAt: string;
	capacity: number;
	lotteryDelayMinutes: number | null;
	autoCloseAfterMinutes: number | null;
	lotteryDrawsAt: string | null;
	autoClosesAt: string | null;
	/** Whether anyone has joined; a session with visits cannot be deleted or replaced. */
	hasVisits: boolean;
	questions: ScheduleQuestion[];
};

export type SchedulePayload = {
	location: ScheduleLocation;
	pattern: SchedulePattern | null;
	/** Unfinished sessions only — ended ones belong to Session History. */
	sessions: ScheduleSessionPayload[];
};
