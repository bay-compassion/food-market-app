import { runInAction } from 'mobx';

import { MarketLocation, type LocalDate } from '../models/market-location.ts';
import { RecurrencePattern } from '../models/recurrence-pattern.ts';
import { ScheduleRow, type ScheduleSession } from '../models/schedule-row.ts';
import { makeReactive } from '../services/make-reactive.ts';
import type { ScheduleApi } from '../services/schedule-api.ts';
import type {
	PatternInput,
	SchedulePayload,
	ScheduleSessionPayload,
	SessionInput,
	SessionTemplate,
} from '../services/schedule-payload.ts';
import type { MarketSessionStore } from './market-session.store.ts';

/** Why a one-off session cannot be added right now, if it cannot. */
export type OneOffBlock = 'active-session' | 'pending-session';

/**
 * A new market's starting point: registration at 10:30 for an hour, drawn by hand, closing itself
 * after 12 hours.
 */
const newTemplate: SessionTemplate = {
	registrationOpensAt: '10:30',
	registrationDurationMinutes: 60,
	capacity: 50,
	lotteryDelayMinutes: null,
	autoCloseAfterMinutes: 720,
	questions: [],
};

export type PipDates = { sessions: ReadonlySet<LocalDate>; projected: ReadonlySet<LocalDate> };

/**
 * The Schedule tab's state: the recurrence pattern, the unfinished sessions, and which calendar
 * month and date the worker is looking at.
 *
 * Constructed only from lazily loaded admin code (see `useScheduleStore`), never from `RootStore`:
 * the models it builds use Luxon, which must stay out of the guest's initial download.
 */
export class ScheduleStore {
	private _payload: SchedulePayload | null = null;
	private _selectedDate: LocalDate | null = null;
	private _visibleMonth: LocalDate | null = null;
	private _isBusy = false;
	private _error: string | null = null;

	constructor(
		private readonly api: ScheduleApi,
		private readonly session: MarketSessionStore,
		private readonly now: () => Date = () => new Date(),
	) {
		return makeReactive(this, { api: false, session: false, now: false });
	}

	get isLoaded(): boolean {
		return this._payload !== null;
	}

	get isBusy(): boolean {
		return this._isBusy;
	}

	get error(): string | null {
		return this._error;
	}

	get selectedDate(): LocalDate | null {
		return this._selectedDate;
	}

	get location(): MarketLocation | null {
		return this._payload ? new MarketLocation(this._payload.location) : null;
	}

	get today(): LocalDate | null {
		return this.location?.localDateOf(this.now()) ?? null;
	}

	/** The first day of the month the calendar shows. */
	get visibleMonth(): LocalDate | null {
		return this._visibleMonth ?? (this.today ? `${this.today.slice(0, 7)}-01` : null);
	}

	get patternInput(): PatternInput | null {
		return this._payload?.pattern ?? null;
	}

	get pattern(): RecurrencePattern | null {
		const record = this._payload?.pattern;
		const location = this.location;

		return record && location ? new RecurrencePattern(record, location) : null;
	}

	get sessions(): ScheduleSessionPayload[] {
		return this._payload?.sessions ?? [];
	}

	/** The location's one unfinished session, if it has one. */
	get unfinishedSession(): ScheduleSessionPayload | null {
		return this.sessions[0] ?? null;
	}

	get rows(): ScheduleRow[] {
		const location = this.location;

		if (!location) {
			return [];
		}

		const pattern = this.pattern;
		const sessionRows = this.sessions.map((session) =>
			ScheduleRow.forSession(scheduleSession(session), location),
		);

		return pattern
			? [
					ScheduleRow.forPattern(pattern, this.unfinishedSession !== null, this.now()),
					...sessionRows,
				]
			: sessionRows;
	}

	/**
	 * The rows for the selected date: its sessions if it has any, otherwise the pattern's row when
	 * the date is one the pattern covers. Every row when no date is selected.
	 */
	get visibleRows(): ScheduleRow[] {
		const date = this._selectedDate;

		if (!date) {
			return this.rows;
		}

		const sessions = this.rows.filter((row) => !row.isPattern && row.matchesDate(date));

		return sessions.length
			? sessions
			: this.rows.filter((row) => row.isPattern && row.matchesDate(date));
	}

	/** The row to highlight: the only one showing for the selected date. */
	get selectedRowId(): string | null {
		return this._selectedDate ? (this.visibleRows[0]?.id ?? null) : null;
	}

	/**
	 * Dates to mark on the visible month: filled for an unfinished session, hollow for a date the
	 * pattern covers after it. Pattern dates are calculated here, never stored.
	 */
	get pipDates(): PipDates {
		const location = this.location;
		const month = this.visibleMonth;
		const today = this.today;

		if (!location || !month || !today) {
			return { sessions: new Set(), projected: new Set() };
		}

		const sessions = new Set(
			this.sessions.map(({ registrationOpensAt }) =>
				location.localDateOf(new Date(registrationOpensAt)),
			),
		);
		const lastSession = [...sessions].toSorted().at(-1);
		const monthEnd = MarketLocation.addDays(
			`${MarketLocation.addDays(month, 32).slice(0, 7)}-01`,
			-1,
		);
		const from =
			lastSession && lastSession >= today ? MarketLocation.addDays(lastSession, 1) : today;
		const projected = this.pattern
			? this.pattern
					.occurrencesBetween(from > month ? from : month, monthEnd)
					.filter((date) => !sessions.has(date))
			: [];

		return { sessions, projected: new Set(projected) };
	}

	get canAddPattern(): boolean {
		return this.isLoaded && this.pattern === null;
	}

	/** Null when a one-off session can be added; otherwise what is in the way. */
	get oneOffBlock(): OneOffBlock | null {
		const unfinished = this.unfinishedSession;

		if (!unfinished) {
			return null;
		}

		if (unfinished.status !== 'scheduled') {
			return 'active-session';
		}

		return unfinished.recurrencePatternId && !unfinished.hasVisits ? null : 'pending-session';
	}

	/** What a new pattern or one-off session starts from: the pattern's settings, if there is one. */
	get templateDefaults(): SessionTemplate {
		const pattern = this._payload?.pattern;

		return pattern
			? {
					registrationOpensAt: pattern.registrationOpensAt,
					registrationDurationMinutes: pattern.registrationDurationMinutes,
					capacity: pattern.capacity,
					lotteryDelayMinutes: pattern.lotteryDelayMinutes,
					autoCloseAfterMinutes: pattern.autoCloseAfterMinutes,
					questions: pattern.questions,
				}
			: newTemplate;
	}

	/** Whether saving the pattern would regenerate its Pending session, discarding edits to it. */
	get savingPatternReplacesPending(): boolean {
		const unfinished = this.unfinishedSession;

		return (
			unfinished?.status === 'scheduled' &&
			unfinished.recurrencePatternId !== null &&
			!unfinished.hasVisits
		);
	}

	sessionById(id: string): ScheduleSessionPayload | null {
		return this.sessions.find((session) => session.id === id) ?? null;
	}

	/** The dialog values an existing session starts from, in the location's local time. */
	sessionInputFor(id: string): SessionInput | null {
		const session = this.sessionById(id);
		const location = this.location;

		if (!session || !location) {
			return null;
		}

		const opensAt = new Date(session.registrationOpensAt);

		return {
			date: location.localDateOf(opensAt),
			registrationOpensAt: location.formatWallClock(opensAt),
			registrationDurationMinutes: Math.round(
				(new Date(session.registrationClosesAt).valueOf() - opensAt.valueOf()) / 60_000,
			),
			capacity: session.capacity,
			lotteryDelayMinutes: session.lotteryDelayMinutes,
			autoCloseAfterMinutes: session.autoCloseAfterMinutes,
			questions: session.questions,
		};
	}

	selectDate(date: LocalDate | null): void {
		this._selectedDate = date;
	}

	setVisibleMonth(month: LocalDate): void {
		this._visibleMonth = `${month.slice(0, 7)}-01`;
	}

	load(): Promise<boolean> {
		return this.apply(() => this.api.load());
	}

	savePattern(input: PatternInput): Promise<boolean> {
		return this.apply(() => this.api.savePattern(input));
	}

	deletePattern(): Promise<boolean> {
		return this.apply(() => this.api.deletePattern());
	}

	createNextSession(): Promise<boolean> {
		return this.apply(() => this.api.createNextSession());
	}

	addOneOff(input: SessionInput): Promise<boolean> {
		return this.apply(() => this.api.addSession(input));
	}

	updateSession(id: string, input: SessionInput): Promise<boolean> {
		return this.apply(() => this.api.updateSession(id, input));
	}

	deleteSession(id: string): Promise<boolean> {
		return this.apply(() => this.api.deleteSession(id));
	}

	/** Opens registration on the Pending session now, then refreshes the schedule. */
	async startNow(): Promise<boolean> {
		return this.apply(async () => {
			if (!(await this.session.sendCommand('open_registration'))) {
				throw new Error(this.session.error?.message ?? 'Registration could not be opened.');
			}

			return this.api.load();
		});
	}

	private async apply(request: () => Promise<SchedulePayload>): Promise<boolean> {
		this._isBusy = true;
		this._error = null;

		try {
			const payload = await request();

			runInAction(() => (this._payload = payload));

			return true;
		} catch (cause) {
			runInAction(
				() =>
					(this._error =
						cause instanceof Error ? cause.message : 'The schedule could not be updated.'),
			);

			return false;
		} finally {
			runInAction(() => (this._isBusy = false));
		}
	}
}

function scheduleSession(payload: ScheduleSessionPayload): ScheduleSession {
	return {
		id: payload.id,
		status: payload.status,
		registrationOpensAt: new Date(payload.registrationOpensAt),
		registrationClosesAt: new Date(payload.registrationClosesAt),
		lotteryDrawsAt: payload.lotteryDrawsAt ? new Date(payload.lotteryDrawsAt) : null,
		recurrencePatternId: payload.recurrencePatternId,
	};
}
