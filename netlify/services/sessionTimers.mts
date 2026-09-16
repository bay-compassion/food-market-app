import { AsyncWorkloadsClient, type CustomAsyncWorkloadEvent } from '@netlify/async-workloads';

import {
	SessionTimeline,
	type SessionTimerKind,
	type SessionTiming,
} from '../../src/models/session-timeline.js';
import { getLogger } from '../lib/logging.mjs';

export const sessionTimerEventName = 'market.session-timer';

/**
 * The event this workload replaced. Still accepted, so a registration close queued before the
 * deploy that introduced `market.session-timer` is not dropped.
 */
export const legacyRegistrationCloseEventName = 'market.registration-close';

export interface SessionTimerEvent extends CustomAsyncWorkloadEvent {
	eventName: typeof sessionTimerEventName;
	eventData: {
		marketEventId: string;
		timer: SessionTimerKind;
		/** When the timer was due as of sending; a handler finding a different time does nothing. */
		expectedAt: string;
	};
}

export interface LegacyRegistrationCloseEvent extends CustomAsyncWorkloadEvent {
	eventName: typeof legacyRegistrationCloseEventName;
	eventData: {
		marketEventId: string;
		expectedRegistrationClosesAt: string;
	};
}

/**
 * The longest a single event is delayed. Netlify does not document a maximum `delayUntil`, and a
 * new session's auto-close can be over a week away, so a later timer is sent in hops: the handler
 * re-sends it when it wakes early.
 */
export const maxTimerDelayMs = 6 * 24 * 60 * 60 * 1000;

/** Sends one timer, due at `expectedAt`, delayed by at most `maxTimerDelayMs`. */
export async function sendSessionTimer(
	marketEventId: string,
	timer: SessionTimerKind,
	expectedAt: Date,
	now: Date = new Date(),
) {
	const client = new AsyncWorkloadsClient<SessionTimerEvent>();
	const result = await client.send(sessionTimerEventName, {
		data: { marketEventId, timer, expectedAt: expectedAt.toISOString() },
		delayUntil: Math.min(expectedAt.valueOf(), now.valueOf() + maxTimerDelayMs),
	});

	if (result.sendStatus === 'failed') {
		throw new Error(`The ${timer} timer could not be scheduled.`);
	}

	return result.eventId;
}

export type TimedSession = SessionTiming & { id: string };

/**
 * Arms each named timer the session has a time for. A timer whose step is not set for this session
 * — a manual lottery, or no auto-close — is skipped. A stale timer left over from before a window
 * moved needs no cancelling: its handler sees the time no longer matches and does nothing.
 */
export async function scheduleSessionTimers(session: TimedSession, timers: SessionTimerKind[]) {
	const timeline = new SessionTimeline(session);

	for (const timer of timers) {
		const expectedAt = timeline.timerAt(timer);

		if (expectedAt) {
			await sendSessionTimer(session.id, timer, expectedAt);
		}
	}
}

/**
 * The same, for paths where a failure must not fail the request — a guest's read of the current
 * session. The transition has already committed, so the failure is reported instead; the next
 * staff action or read that moves the session arms the timers again.
 */
export async function scheduleSessionTimersQuietly(
	session: TimedSession,
	timers: SessionTimerKind[],
) {
	try {
		await scheduleSessionTimers(session, timers);
	} catch (cause) {
		getLogger().warn({
			message: 'market_session.timer_send_failed',
			marketEventId: session.id,
			timers,
			err: cause,
		});
	}
}

/** The timers a newly created or re-timed session needs before it opens. */
export const upcomingSessionTimers: SessionTimerKind[] = ['registration_close', 'auto_close'];
