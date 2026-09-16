import { DateTime } from 'luxon';

import type { SessionStatus } from '../services/sessionStateMachine.ts';
import type { LocalDate, MarketLocation } from './market-location.ts';
import type { RecurrencePattern } from './recurrence-pattern.ts';

/** An unfinished session as the Schedule tab lists it. */
export type ScheduleSession = {
	id: string;
	status: SessionStatus;
	registrationOpensAt: Date;
	registrationClosesAt: Date;
	lotteryDrawsAt: Date | null;
	/** `null` for a one-off session. */
	recurrencePatternId: string | null;
};

export type ScheduleRowStatus = 'recurring' | 'pending' | 'active';

export type ScheduleRowAction =
	| 'edit'
	| 'delete'
	| 'create_next_session'
	| 'start_now'
	| 'go_to_session';

const statusLabels: Record<ScheduleRowStatus, string> = {
	recurring: 'Recurring',
	pending: 'Pending',
	active: 'Active',
};

/**
 * One row of the Schedule tab's grid: either the recurrence pattern or an unfinished session.
 *
 * It owns what the row says and which actions it offers, so the grid only renders. Ended sessions
 * are not rows — they belong to Session History.
 */
export class ScheduleRow {
	private constructor(
		readonly id: string,
		readonly status: ScheduleRowStatus,
		readonly dateLabel: string,
		readonly registrationLabel: string,
		readonly lotteryLabel: string,
		readonly actions: readonly ScheduleRowAction[],
		private readonly matches: (date: LocalDate) => boolean,
	) {}

	get statusLabel(): string {
		return statusLabels[this.status];
	}

	get isPattern(): boolean {
		return this.status === 'recurring';
	}

	/** Whether the row belongs on a local calendar date. */
	matchesDate(date: LocalDate): boolean {
		return this.matches(date);
	}

	/**
	 * The pattern's row. It offers to create the next session only while the location has none, and
	 * belongs on every date from today on that the pattern occurs on.
	 */
	static forPattern(
		pattern: RecurrencePattern,
		hasUnfinishedSession: boolean,
		now: Date,
	): ScheduleRow {
		const opens = DateTime.fromFormat(pattern.registrationOpensAt, 'HH:mm', { zone: 'utc' });
		const closes = opens.plus({ minutes: pattern.registrationDurationMinutes });
		const format = (time: DateTime) => time.setLocale('en-US').toFormat('h:mm a');
		const today = pattern.location.localDateOf(now);

		return new ScheduleRow(
			`pattern:${pattern.id}`,
			'recurring',
			pattern.description,
			`${format(opens)} – ${format(closes)}`,
			pattern.lotteryDelayMinutes == null
				? 'Manual'
				: `${pattern.lotteryDelayMinutes} min after close`,
			hasUnfinishedSession ? ['edit', 'delete'] : ['edit', 'delete', 'create_next_session'],
			(date) => date >= today && pattern.occursOn(date),
		);
	}

	/** An unfinished session's row. */
	static forSession(session: ScheduleSession, location: MarketLocation): ScheduleRow {
		if (session.status === 'ended') {
			throw new RangeError('Ended sessions are not part of the schedule.');
		}

		const pending = session.status === 'scheduled';
		const date = location.localDateOf(session.registrationOpensAt);
		const actions: ScheduleRowAction[] = pending
			? ['start_now', 'edit', ...(session.recurrencePatternId ? [] : ['delete' as const])]
			: ['go_to_session'];

		return new ScheduleRow(
			session.id,
			pending ? 'pending' : 'active',
			location.formatDate(session.registrationOpensAt),
			`${location.formatTime(session.registrationOpensAt)} – ${location.formatTime(session.registrationClosesAt)}`,
			session.lotteryDrawsAt ? location.formatTime(session.lotteryDrawsAt) : 'Manual',
			actions,
			(candidate) => candidate === date,
		);
	}
}
