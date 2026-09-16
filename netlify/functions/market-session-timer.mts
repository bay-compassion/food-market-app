import {
	asyncWorkloadFn,
	type AsyncWorkloadConfig,
	type AsyncWorkloadEvent,
} from '@netlify/async-workloads';
import { eq } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { marketEvents } from '../../db/schema.mjs';
import { SessionTimeline, type SessionTimerKind } from '../../src/models/session-timeline.js';
import { reportedWorkload } from '../lib/sentry.mjs';
import { runLottery } from '../services/lottery.mjs';
import { getCurrentEvent } from '../services/marketSession.mjs';
import { requestNotificationDispatch } from '../services/notificationDispatch.mjs';
import { endSession } from '../services/sessionEnding.mjs';
import {
	legacyRegistrationCloseEventName,
	scheduleSessionTimers,
	sendSessionTimer,
	sessionTimerEventName,
	upcomingSessionTimers,
	type LegacyRegistrationCloseEvent,
	type SessionTimerEvent,
} from '../services/sessionTimers.mjs';

type TimerEvent = SessionTimerEvent | LegacyRegistrationCloseEvent;

function timerFrom({ eventName, eventData }: AsyncWorkloadEvent<TimerEvent>) {
	if (eventName === legacyRegistrationCloseEventName) {
		const legacy = eventData as LegacyRegistrationCloseEvent['eventData'];

		return {
			marketEventId: legacy.marketEventId,
			timer: 'registration_close' as SessionTimerKind,
			expectedAt: legacy.expectedRegistrationClosesAt,
		};
	}

	return eventData as SessionTimerEvent['eventData'];
}

/**
 * Performs one time-based step for a session, but only if the session still expects it.
 *
 * Every event carries the time it was due when sent. Moving a registration window, postponing the
 * draw, or starting a session early changes that time, so an event from before the change finds a
 * mismatch and does nothing — there is nothing to cancel. An event that wakes before its time (a
 * long delay is sent in hops) sends itself again.
 */
export async function runSessionTimer(event: AsyncWorkloadEvent<TimerEvent>, now = new Date()) {
	const { marketEventId, timer, expectedAt } = timerFrom(event);
	const [session] = await db
		.select()
		.from(marketEvents)
		.where(eq(marketEvents.id, marketEventId))
		.limit(1);

	if (!session || session.status === 'ended') {
		return;
	}

	const dueAt = new SessionTimeline(session).timerAt(timer);

	if (!dueAt || dueAt.toISOString() !== expectedAt) {
		return;
	}

	if (now < dueAt) {
		await sendSessionTimer(session.id, timer, dueAt, now);

		return;
	}

	switch (timer) {
		case 'registration_close':
			// Reading the current session applies the close, the grace period, and their notifications.
			await getCurrentEvent();

			return;

		case 'lottery_draw': {
			const current = await getCurrentEvent();

			if (current?.id !== session.id || current.status !== 'lottery_pending') {
				return;
			}

			const drawn = await runLottery(current, undefined, expectedAt);

			if (drawn.ok) {
				await requestNotificationDispatch({
					marketEventId: current.id,
					types: ['lottery_selected', 'lottery_not_selected'],
				});
			}

			return;
		}

		case 'auto_close': {
			const { nextSession } = await db.transaction((tx) =>
				endSession(tx, session, 'auto_close', now),
			);

			if (nextSession) {
				await scheduleSessionTimers(nextSession, upcomingSessionTimers);
			}
		}
	}
}

const handler: ReturnType<typeof asyncWorkloadFn<TimerEvent>> = asyncWorkloadFn<TimerEvent>(
	reportedWorkload('market-session-timer', (event) => runSessionTimer(event)),
);

export default handler;

export const asyncWorkloadConfig: AsyncWorkloadConfig<TimerEvent> = {
	events: [sessionTimerEventName, legacyRegistrationCloseEventName],
	maxRetries: 4,
};
