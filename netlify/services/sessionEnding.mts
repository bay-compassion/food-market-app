import { and, asc, eq, sql } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import {
	marketEvents,
	recurrencePatternQuestions,
	recurrencePatterns,
	registrationQuestions,
} from '../../db/schema.mjs';
import { RecurrencePattern } from '../../src/models/recurrence-pattern.js';
import { locationById } from './marketLocation.mjs';
import type { MarketEventRow } from './marketSession.mjs';
import { resolveOutstandingVisits } from './visitQueue.mjs';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** How a session came to end. Only a reset leaves the location without a next session. */
export type SessionEnding = 'close' | 'auto_close' | 'reset';

export type EndedSession = {
	/** False when the session had already ended or moved on since it was read. */
	ended: boolean;
	/** The session the recurrence pattern created in its place, if any. */
	nextSession: MarketEventRow | null;
};

/**
 * Ends a session, whichever way it ends, in the caller's transaction.
 *
 * The row is locked and its status compared with the one the caller read, so a worker pressing
 * Close Session while the auto-close timer fires ends it once. Every guest still in line —
 * registered, waiting, or called — is resolved to `cancelled`: the market ended their visit, so it
 * never counts as a no-show. Unless the session was reset, the recurrence pattern then creates the
 * next session.
 */
export async function endSession(
	tx: Transaction,
	event: MarketEventRow,
	ending: SessionEnding,
	now: Date = new Date(),
): Promise<EndedSession> {
	const [locked] = await tx
		.select()
		.from(marketEvents)
		.where(eq(marketEvents.id, event.id))
		.limit(1)
		.for('update');

	if (!locked || locked.status === 'ended' || locked.status !== event.status) {
		return { ended: false, nextSession: null };
	}

	await tx
		.update(marketEvents)
		.set({ status: 'ended' })
		.where(and(eq(marketEvents.id, event.id), eq(marketEvents.status, locked.status)));
	await resolveOutstandingVisits(tx, event.id);

	const nextSession =
		ending === 'reset' ? null : await createNextSession(tx, locked.locationId, now);

	return { ended: true, nextSession };
}

/**
 * Creates the location's next session from its recurrence pattern: the earliest occurrence whose
 * registration opens after `now`, with the pattern's settings and questions copied onto it.
 *
 * Returns `null` when the location has no pattern, or when it already has an unfinished session —
 * the partial unique index turns a second one into a no-op rather than an error, which is what
 * makes two callers racing to create it safe.
 */
export async function createNextSession(
	tx: Transaction,
	locationId: string,
	now: Date = new Date(),
): Promise<MarketEventRow | null> {
	const [patternRow] = await tx
		.select()
		.from(recurrencePatterns)
		.where(eq(recurrencePatterns.locationId, locationId))
		.limit(1);

	if (!patternRow) {
		return null;
	}

	const pattern = new RecurrencePattern(patternRow, await locationById(tx, locationId));
	const values = pattern.sessionValues(pattern.nextOccurrence(now).date);
	const [created] = await tx
		.insert(marketEvents)
		.values({
			locationId: values.locationId,
			recurrencePatternId: values.recurrencePatternId,
			registrationOpensAt: values.registrationOpensAt,
			registrationClosesAt: values.registrationClosesAt,
			capacity: values.capacity,
			lotteryDelayMinutes: values.lotteryDelayMinutes,
			autoCloseAfterMinutes: values.autoCloseAfterMinutes,
			status: 'scheduled',
		})
		.onConflictDoNothing({ target: marketEvents.locationId, where: sql`status <> 'ended'` })
		.returning();

	if (!created) {
		return null;
	}

	const questions = await tx
		.select()
		.from(recurrencePatternQuestions)
		.where(eq(recurrencePatternQuestions.recurrencePatternId, pattern.id))
		.orderBy(asc(recurrencePatternQuestions.position));

	if (questions.length) {
		await tx.insert(registrationQuestions).values(
			questions.map(({ prompt, type, required, position }) => ({
				marketEventId: created.id,
				prompt,
				type,
				required,
				position,
			})),
		);
	}

	return created;
}
