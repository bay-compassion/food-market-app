import { and, eq } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { marketEvents } from '../../db/schema.mjs';
import type { SessionInput } from '../../src/services/schedule-payload.js';
import { tracedQuery } from '../lib/sentry.mjs';
import { currentLocation } from './marketLocation.mjs';
import type { ActionResult, MarketEventRow } from './marketSession.mjs';
import {
	deletePendingSession,
	isUniqueViolation,
	lockUnfinishedSession,
	replaceSessionQuestions,
	sessionValuesFrom,
} from './schedule.mjs';
import { createNextSession } from './sessionEnding.mjs';
import { scheduleSessionTimers, upcomingSessionTimers } from './sessionTimers.mjs';

type Refusal = Extract<ActionResult, { ok: false }>;

const opensInThePast: Refusal = {
	ok: false,
	status: 400,
	error: 'Registration must open in the future. Use Start Now to open it right away.',
};

function refused(status: number, error: string): Refusal {
	return { ok: false, status, error };
}

async function armTimers(session: MarketEventRow | null) {
	if (session) {
		await scheduleSessionTimers(session, upcomingSessionTimers);
	}
}

/**
 * Adds a one-off session. It takes the place of the pattern's Pending session if nobody has joined
 * that one — the pattern creates its next session again when the one-off ends — and is refused
 * while any other session is unfinished.
 */
export async function addOneOffSession(
	input: SessionInput,
	now = new Date(),
): Promise<ActionResult> {
	const location = await currentLocation();
	const values = sessionValuesFrom(location, input);

	if (values.registrationOpensAt <= now) {
		return opensInThePast;
	}

	const outcome = await tracedQuery('schedule.add_one_off', () =>
		db
			.transaction(async (tx): Promise<MarketEventRow | Refusal> => {
				const unfinished = await lockUnfinishedSession(tx, location.id);

				if (unfinished) {
					const replaceable =
						unfinished.status === 'scheduled' &&
						unfinished.recurrencePatternId !== null &&
						(await deletePendingSession(tx, unfinished.id));

					if (!replaceable) {
						return refused(409, 'Another session is already scheduled or running.');
					}
				}

				const [created] = await tx
					.insert(marketEvents)
					.values({ ...values, locationId: location.id, status: 'scheduled' })
					.returning();

				await replaceSessionQuestions(tx, created!.id, input.questions);

				return created!;
			})
			.catch((cause: unknown) => {
				if (isUniqueViolation(cause)) {
					return refused(409, 'Another session is already scheduled or running.');
				}

				throw cause;
			}),
	);

	if ('ok' in outcome) {
		return outcome;
	}

	await armTimers(outcome);

	return { ok: true };
}

/** Edits a Pending session without touching the pattern. Refused once it has opened. */
export async function updateSession(
	marketEventId: string,
	input: SessionInput,
	now = new Date(),
): Promise<ActionResult> {
	const location = await currentLocation();
	const values = sessionValuesFrom(location, input);

	if (values.registrationOpensAt <= now) {
		return opensInThePast;
	}

	const outcome = await tracedQuery('schedule.update_session', () =>
		db.transaction(async (tx): Promise<MarketEventRow | Refusal> => {
			const [updated] = await tx
				.update(marketEvents)
				.set(values)
				.where(
					and(
						eq(marketEvents.id, marketEventId),
						eq(marketEvents.locationId, location.id),
						eq(marketEvents.status, 'scheduled'),
					),
				)
				.returning();

			if (!updated) {
				return refused(409, 'Only a session that has not opened yet can be edited.');
			}

			await replaceSessionQuestions(tx, updated.id, input.questions);

			return updated;
		}),
	);

	if ('ok' in outcome) {
		return outcome;
	}

	await armTimers(outcome);

	return { ok: true };
}

/**
 * Deletes a Pending one-off session nobody has joined, and lets the pattern create its next session
 * in its place. A session the pattern created cannot be deleted on its own — the pattern would only
 * create it again; skipping a date is not supported yet.
 */
export async function deleteSession(
	marketEventId: string,
	now = new Date(),
): Promise<ActionResult> {
	const location = await currentLocation();
	const outcome = await tracedQuery('schedule.delete_session', () =>
		db.transaction(async (tx): Promise<MarketEventRow | null | Refusal> => {
			const [session] = await tx
				.select()
				.from(marketEvents)
				.where(and(eq(marketEvents.id, marketEventId), eq(marketEvents.locationId, location.id)))
				.limit(1)
				.for('update');

			if (!session) {
				return refused(404, 'That session does not exist.');
			}

			if (
				session.status !== 'scheduled' ||
				session.recurrencePatternId !== null ||
				!(await deletePendingSession(tx, session.id))
			) {
				return refused(
					409,
					'Only a one-off session that has not opened, and that nobody has joined, can be deleted.',
				);
			}

			return createNextSession(tx, location.id, now);
		}),
	);

	if (outcome && 'ok' in outcome) {
		return outcome;
	}

	await armTimers(outcome);

	return { ok: true };
}
