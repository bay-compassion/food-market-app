import { eq } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { recurrencePatternQuestions, recurrencePatterns } from '../../db/schema.mjs';
import type { PatternInput } from '../../src/services/schedule-payload.js';
import { tracedQuery } from '../lib/sentry.mjs';
import { currentLocation } from './marketLocation.mjs';
import type { ActionResult, MarketEventRow } from './marketSession.mjs';
import { deletePendingSession, lockUnfinishedSession, type Transaction } from './schedule.mjs';
import { createNextSession } from './sessionEnding.mjs';
import { scheduleSessionTimers, upcomingSessionTimers } from './sessionTimers.mjs';

async function lockPattern(tx: Transaction, locationId: string) {
	const [pattern] = await tx
		.select()
		.from(recurrencePatterns)
		.where(eq(recurrencePatterns.locationId, locationId))
		.limit(1)
		.for('update');

	return pattern ?? null;
}

async function armTimers(created: MarketEventRow | null) {
	if (created) {
		await scheduleSessionTimers(created, upcomingSessionTimers);
	}
}

/**
 * Creates the location's recurrence pattern, or replaces the one it has.
 *
 * A Pending session the pattern created is regenerated from the new settings — any edits made to it
 * are discarded, which the dialog warns about. If the location has no session at all, the pattern
 * creates one. An active session, a one-off session, or a Pending session someone has already
 * joined is left alone; the new settings take effect from the next session.
 */
export async function savePattern(input: PatternInput, now = new Date()): Promise<ActionResult> {
	const location = await currentLocation();
	const created = await tracedQuery('schedule.save_pattern', () =>
		db.transaction(async (tx) => {
			const existing = await lockPattern(tx, location.id);
			const values = {
				startsOn: input.startsOn,
				registrationOpensAt: input.registrationOpensAt,
				registrationDurationMinutes: input.registrationDurationMinutes,
				capacity: input.capacity,
				lotteryDelayMinutes: input.lotteryDelayMinutes,
				autoCloseAfterMinutes: input.autoCloseAfterMinutes,
			};
			const [pattern] = existing
				? await tx
						.update(recurrencePatterns)
						.set({ ...values, updatedAt: now })
						.where(eq(recurrencePatterns.id, existing.id))
						.returning()
				: await tx
						.insert(recurrencePatterns)
						.values({ ...values, locationId: location.id })
						.returning();

			await tx
				.delete(recurrencePatternQuestions)
				.where(eq(recurrencePatternQuestions.recurrencePatternId, pattern!.id));

			if (input.questions.length) {
				await tx.insert(recurrencePatternQuestions).values(
					input.questions.map((question, position) => ({
						...question,
						position,
						recurrencePatternId: pattern!.id,
					})),
				);
			}

			const unfinished = await lockUnfinishedSession(tx, location.id);
			const replaceable =
				unfinished?.status === 'scheduled' &&
				unfinished.recurrencePatternId === pattern!.id &&
				(await deletePendingSession(tx, unfinished.id));

			return !unfinished || replaceable ? createNextSession(tx, location.id, now) : null;
		}),
	);

	await armTimers(created);

	return { ok: true };
}

/**
 * Deletes the pattern, and the Pending session it created if nobody has joined it. An active
 * session keeps running and simply has no successor; ended sessions keep their history.
 */
export async function deletePattern(): Promise<ActionResult> {
	const location = await currentLocation();
	const deleted = await tracedQuery('schedule.delete_pattern', () =>
		db.transaction(async (tx) => {
			const pattern = await lockPattern(tx, location.id);

			if (!pattern) {
				return false;
			}

			const unfinished = await lockUnfinishedSession(tx, location.id);

			if (unfinished?.status === 'scheduled' && unfinished.recurrencePatternId === pattern.id) {
				await deletePendingSession(tx, unfinished.id);
			}

			await tx.delete(recurrencePatterns).where(eq(recurrencePatterns.id, pattern.id));

			return true;
		}),
	);

	return deleted
		? { ok: true }
		: { ok: false, status: 404, error: 'There is no recurring pattern.' };
}

/** Creates the pattern's next session by hand — how the schedule resumes after a reset. */
export async function createNextSessionNow(now = new Date()): Promise<ActionResult> {
	const location = await currentLocation();
	const outcome = await tracedQuery('schedule.create_next_session', () =>
		db.transaction(async (tx) => {
			if (await lockUnfinishedSession(tx, location.id)) {
				return 'busy' as const;
			}

			if (!(await lockPattern(tx, location.id))) {
				return 'no_pattern' as const;
			}

			return (await createNextSession(tx, location.id, now)) ?? ('busy' as const);
		}),
	);

	if (outcome === 'busy') {
		return { ok: false, status: 409, error: 'A session is already scheduled or running.' };
	}

	if (outcome === 'no_pattern') {
		return { ok: false, status: 409, error: 'There is no recurring pattern to create it from.' };
	}

	await armTimers(outcome);

	return { ok: true };
}
