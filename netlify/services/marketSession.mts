import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { marketEvents, registrationQuestions, visits } from '../../db/schema.mjs';
import { SessionTimeline } from '../../src/models/session-timeline.js';
import { tracedQuery } from '../lib/sentry.mjs';
import { requestNotificationDispatch } from './notificationDispatch.mjs';
import { queueNotification } from './notifications.mjs';
import { notificationsEnabled } from './pushNotifications.mjs';

export type MarketEventRow = typeof marketEvents.$inferSelect;

export type ActionResult = { ok: true } | { ok: false; status: number; error: string };

async function getLatestActiveEvent() {
	const [event] = await tracedQuery('market_session.latest_active_event', () =>
		db
			.select()
			.from(marketEvents)
			.where(ne(marketEvents.status, 'ended'))
			.orderBy(desc(marketEvents.createdAt))
			.limit(1),
	);

	return event ?? null;
}

/**
 * Fetches the current market event, lazily transitioning its status (e.g. to
 * `registration_closed`) if wall-clock time has passed it by. Note: this means a plain,
 * unauthenticated `GET /api/market` can trigger a database write as a side effect of a read.
 * It's guarded by an optimistic-concurrency `WHERE`, so it's race-safe, but callers/tests should
 * not assume this is a pure read.
 */
export async function getCurrentEvent() {
	let event = await getLatestActiveEvent();

	if (!event) {
		return null;
	}

	const now = new Date();
	const automaticStatus = new SessionTimeline(event).statusAt(now);

	if (automaticStatus !== event.status) {
		// `event` is a `let` reassigned below, so TypeScript drops its non-null narrowing inside the
		// transaction closure. Capturing it as a const keeps the narrowing without changing behaviour.
		const current = event;
		const graceEndsAt = new SessionTimeline(current).graceDeadline;
		const transition = await tracedQuery('market_session.apply_automatic_status', () =>
			db.transaction(async (tx) => {
				const [changed] = await tx
					.update(marketEvents)
					.set({
						status: automaticStatus,
						...(automaticStatus === 'registration_closed' || automaticStatus === 'lottery_pending'
							? { registrationGraceEndsAt: graceEndsAt }
							: {}),
					})
					.where(and(eq(marketEvents.id, current.id), eq(marketEvents.status, current.status)))
					.returning();

				const notificationQueued = Boolean(
					changed &&
					(current.status === 'scheduled' || current.status === 'registration_open') &&
					(automaticStatus === 'registration_closed' || automaticStatus === 'lottery_pending') &&
					notificationsEnabled(),
				);

				if (notificationQueued) {
					const registrations = await tx
						.select({ visitId: visits.id })
						.from(visits)
						.where(and(eq(visits.marketEventId, current.id), eq(visits.status, 'registered')));

					await queueNotification(
						tx,
						registrations.map(({ visitId }) => visitId),
						'registration_closed',
						'registration_closed',
					);
				}

				return { changed, notificationQueued };
			}),
		);

		if (transition.notificationQueued) {
			await requestNotificationDispatch({
				marketEventId: current.id,
				types: ['registration_closed'],
			});
		}

		event = transition.changed ?? (await getLatestActiveEvent()) ?? current;
	}

	return event;
}

export async function marketOverview() {
	const event = await getCurrentEvent();

	if (!event) {
		return { event: null, questions: [], counts: {} as Record<string, number> };
	}

	const questions = await tracedQuery('market_session.overview_questions', () =>
		db
			.select()
			.from(registrationQuestions)
			.where(eq(registrationQuestions.marketEventId, event.id))
			.orderBy(asc(registrationQuestions.position)),
	);

	const rows = await tracedQuery('market_session.overview_counts', () =>
		db
			.select({ status: visits.status, count: sql<number>`count(*)::int` })
			.from(visits)
			.where(eq(visits.marketEventId, event.id))
			.groupBy(visits.status),
	);

	return {
		event,
		questions,
		counts: Object.fromEntries(rows.map((row) => [row.status, row.count])),
	};
}

export async function marketHistory() {
	const events = await tracedQuery('market_session.history_events', () =>
		db
			.select()
			.from(marketEvents)
			.where(eq(marketEvents.status, 'ended'))
			.orderBy(desc(marketEvents.createdAt))
			.limit(100),
	);

	if (!events.length) {
		return [];
	}

	const rows = await tracedQuery('market_session.history_counts', () =>
		db
			.select({ marketEventId: visits.marketEventId, count: sql<number>`count(*)::int` })
			.from(visits)
			.where(
				inArray(
					visits.marketEventId,
					events.map(({ id }) => id),
				),
			)
			.groupBy(visits.marketEventId),
	);

	const guestCounts = new Map(rows.map((row) => [row.marketEventId, row.count]));

	return events.map((event) => ({
		...event,
		guestCount: guestCounts.get(event.id) ?? 0,
	}));
}
