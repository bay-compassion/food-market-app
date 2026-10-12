import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { visits } from '../../db/schema.mjs';
import type { QueueBoardState } from '../../src/models/queue-board.js';
import { tracedQuery } from '../lib/sentry.mjs';
import { getCurrentEvent } from './marketSession.mjs';

/**
 * The main-series number the "now calling" board shows: the highest one called this session — the
 * board a DMV hangs over the counter.
 *
 * Highest rather than most recent, so the board only ever counts up: a guest returned to the queue
 * keeps their number, and calling them later must not send the board back from 50 to 38 in front
 * of everyone comparing their own number with it. A batch resolves to its highest number the same
 * way. Reads `called_at` rather than `status = 'called'`: serving or marking a guest a no-show keeps
 * their `called_at`, so the board doesn't drop back the moment a worker finishes with someone, while
 * returning a guest to the queue clears it, so a number that was un-called stops showing.
 *
 * Priority numbers (`P1`, …) are not on it: they count on their own, and a guest cannot compare
 * theirs with one. `queueBoard().calledPriority` lists the ones at the entrance.
 */
export async function highestCalledNumber(marketEventId: string): Promise<number | null> {
	const [highest] = await tracedQuery('visit.now_calling', () =>
		db
			.select({ queuePosition: sql<number | null>`max(${visits.queuePosition})` })
			.from(visits)
			.where(and(eq(visits.marketEventId, marketEventId), isNotNull(visits.calledAt))),
	);

	return highest?.queuePosition ?? null;
}

/**
 * Every number called but not yet served or marked a no-show, most recently called first, by
 * series — the people expected at the entrance. Shared by the room display and a waiting guest's
 * phone, so the two list the same numbers.
 */
export async function calledNumbers(
	marketEventId: string,
): Promise<Pick<QueueBoardState, 'called' | 'calledPriority'>> {
	const rows = await tracedQuery('queue_board.called', () =>
		db
			.select({ queuePosition: visits.queuePosition, priorityNumber: visits.priorityNumber })
			.from(visits)
			.where(and(eq(visits.marketEventId, marketEventId), eq(visits.status, 'called')))
			// Newest first, so a display that runs out of room drops the oldest.
			.orderBy(desc(visits.calledAt), desc(visits.queuePosition), desc(visits.priorityNumber)),
	);

	return {
		called: rows.flatMap(({ queuePosition }) => (queuePosition === null ? [] : [queuePosition])),
		calledPriority: rows.flatMap(({ priorityNumber }) =>
			priorityNumber === null ? [] : [priorityNumber],
		),
	};
}

/**
 * The current session's queue as the room display shows it. Queue numbers only — the display sits
 * where anyone can read it, so nothing here names a guest.
 *
 * Before service starts nobody has been called, so the queries are skipped and the board is empty.
 */
export async function queueBoard(): Promise<QueueBoardState> {
	const event = await getCurrentEvent();
	const empty = { nowCalling: null, called: [], calledPriority: [], waitingCount: 0 };

	if (!event) {
		return { sessionStatus: null, ...empty };
	}

	if (event.status !== 'service_started') {
		return { sessionStatus: event.status, ...empty };
	}

	const called = await calledNumbers(event.id);
	const [waiting] = await tracedQuery('queue_board.waiting_count', () =>
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(visits)
			.where(and(eq(visits.marketEventId, event.id), eq(visits.status, 'waiting'))),
	);

	return {
		sessionStatus: event.status,
		nowCalling: await highestCalledNumber(event.id),
		...called,
		waitingCount: waiting?.count ?? 0,
	};
}
