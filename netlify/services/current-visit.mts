import { and, desc, eq, ne } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { marketEvents, visits } from '../../db/schema.mjs';
import type { Transaction } from './guest-information.mjs';

/**
 * The guest's visit in the newest session that has not ended, if they have one. A visit in an ended
 * session is deliberately not "current": nothing about it can change any more.
 */
export async function currentMarketVisitForGuest(
	guestId: string,
	executor: Transaction | typeof db = db,
) {
	const [event] = await executor
		.select({ id: marketEvents.id })
		.from(marketEvents)
		.where(ne(marketEvents.status, 'ended'))
		.orderBy(desc(marketEvents.createdAt))
		.limit(1);

	if (!event) {
		return null;
	}

	const [visit] = await executor
		.select({ id: visits.id, marketEventId: visits.marketEventId, status: visits.status })
		.from(visits)
		.where(and(eq(visits.guestId, guestId), eq(visits.marketEventId, event.id)))
		.orderBy(desc(visits.createdAt))
		.limit(1);

	return visit ?? null;
}
