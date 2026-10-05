import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { visits } from '../../db/schema.mjs';
import type { QueueBoardState } from '../../src/models/queue-board.js';
import { tracedQuery } from '../lib/sentry.mjs';
import { getCurrentEvent } from './marketSession.mjs';

/**
 * The queue number most recently called in a session — the "now calling" board a DMV hangs over
 * the counter.
 *
 * Reads `called_at` rather than `status = 'called'`: serving or marking a guest a no-show keeps
 * their `called_at`, so the board doesn't drop back to an older number (or blank) the moment a
 * worker finishes with someone, while returning a guest to the queue clears it, so a number that
 * was un-called stops showing. `callNextVisits` stamps a whole batch with one `now()`, so the tie
 * falls to the highest position in that batch.
 */
export async function latestCalledPosition(marketEventId: string): Promise<number | null> {
	const [latest] = await tracedQuery('visit.now_calling', () =>
		db
			.select({ queuePosition: visits.queuePosition })
			.from(visits)
			.where(
				and(
					eq(visits.marketEventId, marketEventId),
					isNotNull(visits.calledAt),
					isNotNull(visits.queuePosition),
				),
			)
			.orderBy(desc(visits.calledAt), desc(visits.queuePosition))
			.limit(1),
	);

	return latest?.queuePosition ?? null;
}

/**
 * The current session's queue as the room display shows it. Queue numbers only — the display sits
 * where anyone can read it, so nothing here names a guest.
 *
 * Before service starts nobody has been called, so the queries are skipped and the board is empty.
 */
export async function queueBoard(): Promise<QueueBoardState> {
	const event = await getCurrentEvent();
	const empty = { nowCalling: null, called: [], waitingCount: 0 };

	if (!event) {
		return { sessionStatus: null, ...empty };
	}

	if (event.status !== 'service_started') {
		return { sessionStatus: event.status, ...empty };
	}

	const called = await tracedQuery('queue_board.called', () =>
		db
			.select({ queuePosition: visits.queuePosition })
			.from(visits)
			.where(
				and(
					eq(visits.marketEventId, event.id),
					eq(visits.status, 'called'),
					isNotNull(visits.queuePosition),
				),
			)
			// Newest first, matching `latestCalledPosition`'s tie-break within a batch, so the
			// display drops the oldest when it runs out of room.
			.orderBy(desc(visits.calledAt), desc(visits.queuePosition)),
	);
	const [waiting] = await tracedQuery('queue_board.waiting_count', () =>
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(visits)
			.where(and(eq(visits.marketEventId, event.id), eq(visits.status, 'waiting'))),
	);

	return {
		sessionStatus: event.status,
		nowCalling: await latestCalledPosition(event.id),
		called: called.flatMap(({ queuePosition }) => (queuePosition === null ? [] : [queuePosition])),
		waitingCount: waiting?.count ?? 0,
	};
}
