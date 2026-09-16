import { and, asc, count, eq, inArray, ne } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import {
	marketEvents,
	recurrencePatternQuestions,
	recurrencePatterns,
	registrationQuestions,
	visits,
} from '../../db/schema.mjs';
import type { MarketLocation } from '../../src/models/market-location.js';
import { SessionTimeline } from '../../src/models/session-timeline.js';
import type {
	ScheduleQuestion,
	SchedulePayload,
	SessionInput,
} from '../../src/services/schedule-payload.js';
import { tracedQuery } from '../lib/sentry.mjs';
import { currentLocation } from './marketLocation.mjs';

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = Transaction | typeof db;

const minuteMs = 60_000;

type QuestionRow = { prompt: string; type: string; required: boolean; position: number };

function questionsOf(rows: QuestionRow[]): ScheduleQuestion[] {
	return rows
		.toSorted((first, second) => first.position - second.position)
		.map(({ prompt, type, required }) => ({
			prompt,
			// A stored type the console does not recognise still renders as a text answer.
			type: type === 'scale' ? 'scale' : 'text',
			required,
		}));
}

/** The Schedule tab's state: the location, its pattern, and its unfinished sessions. */
export async function getSchedule(): Promise<SchedulePayload> {
	const location = await currentLocation();

	return tracedQuery('schedule.read', async () => {
		const [pattern] = await db
			.select()
			.from(recurrencePatterns)
			.where(eq(recurrencePatterns.locationId, location.id))
			.limit(1);
		const patternQuestions = pattern
			? await db
					.select()
					.from(recurrencePatternQuestions)
					.where(eq(recurrencePatternQuestions.recurrencePatternId, pattern.id))
			: [];
		const sessions = await db
			.select()
			.from(marketEvents)
			.where(and(eq(marketEvents.locationId, location.id), ne(marketEvents.status, 'ended')))
			.orderBy(asc(marketEvents.registrationOpensAt));
		const sessionIds = sessions.map(({ id }) => id);
		const questions = sessionIds.length
			? await db
					.select()
					.from(registrationQuestions)
					.where(inArray(registrationQuestions.marketEventId, sessionIds))
			: [];
		const visitCounts = sessionIds.length
			? await db
					.select({ marketEventId: visits.marketEventId, visits: count() })
					.from(visits)
					.where(inArray(visits.marketEventId, sessionIds))
					.groupBy(visits.marketEventId)
			: [];

		return {
			location: { id: location.id, name: location.name, timeZone: location.timeZone },
			pattern: pattern
				? {
						id: pattern.id,
						startsOn: pattern.startsOn,
						registrationOpensAt: pattern.registrationOpensAt.slice(0, 5),
						registrationDurationMinutes: pattern.registrationDurationMinutes,
						capacity: pattern.capacity,
						lotteryDelayMinutes: pattern.lotteryDelayMinutes,
						autoCloseAfterMinutes: pattern.autoCloseAfterMinutes,
						questions: questionsOf(patternQuestions),
					}
				: null,
			sessions: sessions.map((session) => {
				const timeline = new SessionTimeline(session);

				return {
					id: session.id,
					status: session.status,
					recurrencePatternId: session.recurrencePatternId,
					registrationOpensAt: session.registrationOpensAt.toISOString(),
					registrationClosesAt: session.registrationClosesAt.toISOString(),
					capacity: session.capacity,
					lotteryDelayMinutes: session.lotteryDelayMinutes,
					autoCloseAfterMinutes: session.autoCloseAfterMinutes,
					lotteryDrawsAt: timeline.lotteryDrawsAt?.toISOString() ?? null,
					autoClosesAt: timeline.autoClosesAt?.toISOString() ?? null,
					hasVisits: visitCounts.some((row) => row.marketEventId === session.id && row.visits > 0),
					questions: questionsOf(
						questions.filter(({ marketEventId }) => marketEventId === session.id),
					),
				};
			}),
		};
	});
}

/** The location's unfinished session, locked for the rest of the transaction. */
export async function lockUnfinishedSession(tx: Transaction, locationId: string) {
	const [session] = await tx
		.select()
		.from(marketEvents)
		.where(and(eq(marketEvents.locationId, locationId), ne(marketEvents.status, 'ended')))
		.limit(1)
		.for('update');

	return session ?? null;
}

export async function sessionHasVisits(executor: Executor, marketEventId: string) {
	const [row] = await executor
		.select({ visits: count() })
		.from(visits)
		.where(eq(visits.marketEventId, marketEventId));

	return (row?.visits ?? 0) > 0;
}

/**
 * Deletes a session that never opened and nobody joined — the only kind that can go without a
 * trace. Returns whether it did.
 */
export async function deletePendingSession(tx: Transaction, marketEventId: string) {
	if (await sessionHasVisits(tx, marketEventId)) {
		return false;
	}

	const [deleted] = await tx
		.delete(marketEvents)
		.where(and(eq(marketEvents.id, marketEventId), eq(marketEvents.status, 'scheduled')))
		.returning({ id: marketEvents.id });

	return Boolean(deleted);
}

/** The session columns a dialog's local date and times resolve to at the location. */
export function sessionValuesFrom(location: MarketLocation, input: SessionInput) {
	const registrationOpensAt = location.instantAt(input.date, input.registrationOpensAt);

	return {
		registrationOpensAt,
		registrationClosesAt: new Date(
			registrationOpensAt.valueOf() + input.registrationDurationMinutes * minuteMs,
		),
		capacity: input.capacity,
		lotteryDelayMinutes: input.lotteryDelayMinutes,
		autoCloseAfterMinutes: input.autoCloseAfterMinutes,
	};
}

export async function replaceSessionQuestions(
	tx: Transaction,
	marketEventId: string,
	questions: ScheduleQuestion[],
) {
	await tx
		.delete(registrationQuestions)
		.where(eq(registrationQuestions.marketEventId, marketEventId));

	if (questions.length) {
		await tx
			.insert(registrationQuestions)
			.values(questions.map((question, position) => ({ ...question, position, marketEventId })));
	}
}

/** Whether a database error is a unique violation — here, a second unfinished session. */
export function isUniqueViolation(cause: unknown): boolean {
	const code = (error: unknown) =>
		typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

	return (
		code(cause) === '23505' ||
		(typeof cause === 'object' &&
			cause !== null &&
			'cause' in cause &&
			code(cause.cause) === '23505')
	);
}
