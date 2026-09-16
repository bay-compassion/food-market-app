import type { SessionMode, SessionStatus } from '../services/sessionStateMachine.ts';

/** The timing a session row carries. The optional fields default to "not set". */
export type SessionTiming = {
	status: SessionStatus;
	sessionMode?: SessionMode;
	registrationOpensAt: Date;
	registrationClosesAt: Date;
	registrationGraceEndsAt?: Date | null;
	lotteryDelayMinutes?: number | null;
	autoCloseAfterMinutes?: number | null;
};

/** A time-based step a background timer can be armed for. */
export type SessionTimerKind = 'registration_close' | 'lottery_draw' | 'auto_close';

const minuteMs = 60_000;

/**
 * When things happen to one session: its grace deadline, lottery draw, and auto-close, and which
 * status wall-clock time has already carried it to.
 *
 * Built from a session row rather than owning one. Lottery delay and auto-close are stored as
 * offsets, so every time here is derived from the registration window as it stands — Start Now
 * and postponement move them without anything having to be recomputed.
 *
 * Plain `Date` arithmetic only: this is read on the guest's first screen, so it must not pull a
 * date library into the initial download.
 */
export class SessionTimeline {
	/** How long an in-flight self-service registration may still commit after registration closes. */
	static readonly gracePeriodMs = 30_000;

	constructor(private readonly session: SessionTiming) {}

	/** The grace deadline for a registration window closing at `closesAt`. */
	static graceDeadlineAfter(closesAt: Date): Date {
		return new Date(closesAt.valueOf() + SessionTimeline.gracePeriodMs);
	}

	/** The stored grace deadline, or the one registration close implies. */
	get graceDeadline(): Date {
		return (
			this.session.registrationGraceEndsAt ??
			SessionTimeline.graceDeadlineAfter(this.session.registrationClosesAt)
		);
	}

	/** When the lottery draws on its own, or `null` when it is drawn by hand. */
	get lotteryDrawsAt(): Date | null {
		const delay = this.session.lotteryDelayMinutes;

		return delay == null ? null : new Date(this.graceDeadline.valueOf() + delay * minuteMs);
	}

	/** When the session ends on its own, or `null` when it never does. */
	get autoClosesAt(): Date | null {
		const after = this.session.autoCloseAfterMinutes;

		return after == null
			? null
			: new Date(this.session.registrationOpensAt.valueOf() + after * minuteMs);
	}

	/** The status wall-clock time has carried the session to, before any ending is applied. */
	statusAt(now: Date): SessionStatus {
		const { status, registrationOpensAt, registrationClosesAt } = this.session;
		const graceEndsAt = this.graceDeadline;

		if (status === 'scheduled' && registrationOpensAt <= now) {
			if (registrationClosesAt > now) {
				return 'registration_open';
			}

			return graceEndsAt <= now ? 'lottery_pending' : 'registration_closed';
		}

		if (status === 'registration_open' && registrationClosesAt <= now) {
			return graceEndsAt <= now ? 'lottery_pending' : 'registration_closed';
		}

		if (status === 'registration_closed' && graceEndsAt <= now) {
			return 'lottery_pending';
		}

		return status;
	}

	/** Whether a self-service request may still commit, including the brief post-close grace period. */
	acceptsSelfRegistration(now: Date): boolean {
		const status = this.statusAt(now);

		return status === 'registration_open' || status === 'registration_closed';
	}

	/** Whether the session is unfinished and its auto-close time has passed. */
	isOverdueForAutoClose(now: Date): boolean {
		const closesAt = this.autoClosesAt;

		return this.session.status !== 'ended' && closesAt !== null && closesAt <= now;
	}

	/** The registration window when registration opens at `now`, keeping its length. */
	openingWindow(now: Date): { registrationOpensAt: Date; registrationClosesAt: Date } {
		const { sessionMode, registrationOpensAt, registrationClosesAt } = this.session;

		return {
			registrationOpensAt: now,
			registrationClosesAt:
				sessionMode === 'ad_hoc'
					? registrationClosesAt
					: new Date(
							now.valueOf() + (registrationClosesAt.valueOf() - registrationOpensAt.valueOf()),
						),
		};
	}

	/** The registration window shifted `minutes` later. */
	postponedWindow(minutes: number): { registrationOpensAt: Date; registrationClosesAt: Date } {
		const delay = minutes * minuteMs;

		return {
			registrationOpensAt: new Date(this.session.registrationOpensAt.valueOf() + delay),
			registrationClosesAt: new Date(this.session.registrationClosesAt.valueOf() + delay),
		};
	}

	/** When a timer of `kind` is due, or `null` when that step is not scheduled for this session. */
	timerAt(kind: SessionTimerKind): Date | null {
		switch (kind) {
			case 'registration_close':
				return this.session.registrationClosesAt;
			case 'lottery_draw':
				return this.lotteryDrawsAt;
			case 'auto_close':
				return this.autoClosesAt;
		}
	}
}
