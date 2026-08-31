import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { marketEvents, registrationQuestions, visits } from '../../db/schema.mjs';
import {
	automaticSessionStatus,
	canRunSessionCommand,
	openingWindow,
	postponedWindow,
	registrationGraceDeadline,
	sessionCommandTarget,
	type SessionMode,
	type SessionStatus,
} from '../../src/services/sessionStateMachine.js';
import { queueNotification } from './notifications.mjs';
import { notificationsEnabled } from './pushNotifications.mjs';
import { resolveOutstandingVisits } from './visitQueue.mjs';

export type MarketEventRow = typeof marketEvents.$inferSelect;
export type QuestionInput = { prompt: string; type: 'text' | 'scale'; required: boolean };
export type ParsedSettings = {
	registrationOpensAt: Date;
	registrationClosesAt: Date;
	capacity: number;
	questions: QuestionInput[];
	sessionMode: SessionMode;
};

export type ActionResult = { ok: true } | { ok: false; status: number; error: string };

async function getLatestActiveEvent() {
	const [event] = await db
		.select()
		.from(marketEvents)
		.where(ne(marketEvents.status, 'ended'))
		.orderBy(desc(marketEvents.createdAt))
		.limit(1);

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
	const automaticStatus = automaticSessionStatus(event, now);

	if (automaticStatus !== event.status) {
		const graceEndsAt = event.registrationGraceEndsAt ?? registrationGraceDeadline(event);
		const updated = await db.transaction(async (tx) => {
			const [changed] = await tx
				.update(marketEvents)
				.set({
					status: automaticStatus,
					...(automaticStatus === 'registration_closed' || automaticStatus === 'lottery_pending'
						? { registrationGraceEndsAt: graceEndsAt }
						: {}),
				})
				.where(and(eq(marketEvents.id, event.id), eq(marketEvents.status, event.status)))
				.returning();

			if (
				changed &&
				(event.status === 'scheduled' || event.status === 'registration_open') &&
				(automaticStatus === 'registration_closed' || automaticStatus === 'lottery_pending') &&
				notificationsEnabled()
			) {
				const registrations = await tx
					.select({ visitId: visits.id })
					.from(visits)
					.where(and(eq(visits.marketEventId, event.id), eq(visits.status, 'registered')));

				await queueNotification(
					tx,
					registrations.map(({ visitId }) => visitId),
					'registration_closed',
					'registration_closed',
				);
			}

			return changed;
		});

		event = updated ?? (await getLatestActiveEvent()) ?? event;
	}

	return event;
}

export async function marketOverview() {
	const event = await getCurrentEvent();

	if (!event) {
		return { event: null, questions: [], counts: {} as Record<string, number> };
	}

	const questions = await db
		.select()
		.from(registrationQuestions)
		.where(eq(registrationQuestions.marketEventId, event.id))
		.orderBy(asc(registrationQuestions.position));
	const rows = await db
		.select({ status: visits.status, count: sql<number>`count(*)::int` })
		.from(visits)
		.where(eq(visits.marketEventId, event.id))
		.groupBy(visits.status);

	return {
		event,
		questions,
		counts: Object.fromEntries(rows.map((row) => [row.status, row.count])),
	};
}

export async function marketHistory() {
	const events = await db
		.select()
		.from(marketEvents)
		.where(eq(marketEvents.status, 'ended'))
		.orderBy(desc(marketEvents.createdAt))
		.limit(100);

	if (!events.length) {
		return [];
	}

	const rows = await db
		.select({ marketEventId: visits.marketEventId, count: sql<number>`count(*)::int` })
		.from(visits)
		.where(
			inArray(
				visits.marketEventId,
				events.map(({ id }) => id),
			),
		)
		.groupBy(visits.marketEventId);
	const guestCounts = new Map(rows.map((row) => [row.marketEventId, row.count]));

	return events.map((event) => ({
		...event,
		guestCount: guestCounts.get(event.id) ?? 0,
	}));
}

export function parseSettings(value: unknown): ParsedSettings | null {
	if (!value || typeof value !== 'object') {
		return null;
	}
	const body = value as Record<string, unknown>;
	const registrationOpensAt = new Date(String(body.registrationOpensAt));
	const registrationClosesAt = new Date(String(body.registrationClosesAt));
	const capacity = Number(body.capacity);
	const sessionMode: SessionMode = body.sessionMode === 'ad_hoc' ? 'ad_hoc' : 'scheduled';
	const rawQuestions = body.questions;

	if (
		Number.isNaN(registrationOpensAt.valueOf()) ||
		Number.isNaN(registrationClosesAt.valueOf()) ||
		registrationClosesAt <= registrationOpensAt ||
		!Number.isInteger(capacity) ||
		capacity < 1 ||
		capacity > 10_000 ||
		!Array.isArray(rawQuestions)
	) {
		return null;
	}
	const questions: QuestionInput[] = [];

	for (const item of rawQuestions) {
		if (!item || typeof item !== 'object') {
			return null;
		}
		const question = item as Record<string, unknown>;
		const prompt = typeof question.prompt === 'string' ? question.prompt.trim() : '';
		const type = question.type === 'scale' ? 'scale' : 'text';

		if (!prompt || prompt.length > 300) {
			return null;
		}
		questions.push({ prompt, type, required: question.required === true });
	}

	return { registrationOpensAt, registrationClosesAt, capacity, questions, sessionMode };
}

export async function saveSettings(settings: ParsedSettings): Promise<ActionResult> {
	const current = await getCurrentEvent();

	if (current && current.status !== 'draft') {
		return {
			ok: false,
			status: 409,
			error: 'Session settings can only be changed before registration opens.',
		};
	}
	const saved = await db
		.transaction(async (tx) => {
			let event: MarketEventRow;

			if (current) {
				const [updated] = await tx
					.update(marketEvents)
					.set({
						registrationOpensAt: settings.registrationOpensAt,
						registrationClosesAt: settings.registrationClosesAt,
						capacity: settings.capacity,
						sessionMode: settings.sessionMode,
					})
					.where(and(eq(marketEvents.id, current.id), eq(marketEvents.status, 'draft')))
					.returning();

				if (!updated) {
					throw new Error('SESSION_SETTINGS_LOCKED');
				}
				await tx
					.delete(registrationQuestions)
					.where(eq(registrationQuestions.marketEventId, current.id));

				event = updated!;
			} else {
				const [created] = await tx
					.insert(marketEvents)
					.values({
						registrationOpensAt: settings.registrationOpensAt,
						registrationClosesAt: settings.registrationClosesAt,
						capacity: settings.capacity,
						sessionMode: settings.sessionMode,
					})
					.returning();

				event = created!;
			}

			if (settings.questions.length) {
				await tx.insert(registrationQuestions).values(
					settings.questions.map((question, position) => ({
						...question,
						position,
						marketEventId: event.id,
					})),
				);
			}
		})
		.catch((cause: unknown) => {
			if (cause instanceof Error && cause.message === 'SESSION_SETTINGS_LOCKED') {
				return false;
			}
			throw cause;
		});

	if (saved === false) {
		return {
			ok: false,
			status: 409,
			error: 'Session settings can only be changed before registration opens.',
		};
	}

	return { ok: true };
}

/**
 * Orders visits for the draw, giving a heavier `lotteryWeight` proportionally better odds of
 * landing near the front.
 *
 * Each visit gets the key `random^(1/weight)` and the list is sorted by that key, descending.
 * Sorting by that key is equivalent to drawing entries one at a time without replacement, each
 * time in proportion to the weights still in the pool (Efraimidis–Spirakis), so a visit weighted 2
 * really is twice as likely as a 1 to come out ahead — not merely sorted ahead of it.
 *
 * With every weight left at the default 1 this is a plain uniform shuffle.
 */
export function weightedShuffle<T extends { lotteryWeight: number }>(items: T[]) {
	return items
		.map((item) => {
			const random = crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32;

			return { item, key: random ** (1 / Math.max(1, item.lotteryWeight)) };
		})
		.sort((first, second) => second.key - first.key)
		.map(({ item }) => item);
}

export function parseRegistrationOverride(value: unknown) {
	if (!value || typeof value !== 'object') {
		return null;
	}
	const body = value as Record<string, unknown>;
	const registrationClosesAt = new Date(String(body.registrationClosesAt));
	const capacity = Number(body.capacity);

	if (
		Number.isNaN(registrationClosesAt.valueOf()) ||
		!Number.isInteger(capacity) ||
		capacity < 1 ||
		capacity > 10_000
	) {
		return null;
	}

	return { registrationClosesAt, capacity };
}

async function transitionEvent(event: MarketEventRow, from: SessionStatus, to: SessionStatus) {
	if (event.status !== from) {
		return false;
	}
	const [updated] = await db
		.update(marketEvents)
		.set({ status: to })
		.where(and(eq(marketEvents.id, event.id), eq(marketEvents.status, from)))
		.returning({ id: marketEvents.id });

	return Boolean(updated);
}

export async function resetSession(event: MarketEventRow): Promise<ActionResult> {
	const target = sessionCommandTarget('reset_session');

	if (!target || !canRunSessionCommand(event.status, 'reset_session', event.sessionMode)) {
		return { ok: false, status: 409, error: 'The current session could not be reset.' };
	}
	const [reset] = await db
		.update(marketEvents)
		.set({ status: target })
		.where(and(eq(marketEvents.id, event.id), ne(marketEvents.status, 'ended')))
		.returning({ id: marketEvents.id });

	if (!reset) {
		return { ok: false, status: 409, error: 'The current session could not be reset.' };
	}

	return { ok: true };
}

export async function updateRegistration(
	event: MarketEventRow,
	body: unknown,
): Promise<ActionResult> {
	const override = parseRegistrationOverride(body);

	if (
		!canRunSessionCommand(event.status, 'update_registration', event.sessionMode) ||
		!override ||
		override.registrationClosesAt < event.registrationClosesAt ||
		override.registrationClosesAt <= event.registrationOpensAt
	) {
		return { ok: false, status: 400, error: 'Please provide valid registration overrides.' };
	}
	const [updated] = await db
		.update(marketEvents)
		.set(override)
		.where(and(eq(marketEvents.id, event.id), eq(marketEvents.status, 'registration_open')))
		.returning({ id: marketEvents.id });

	if (!updated) {
		return {
			ok: false,
			status: 409,
			error: 'Registration overrides are only available while registration is open.',
		};
	}

	return { ok: true };
}

export async function scheduleRegistration(event: MarketEventRow): Promise<ActionResult> {
	const target = sessionCommandTarget('schedule_registration');

	if (
		!target ||
		!canRunSessionCommand(event.status, 'schedule_registration', event.sessionMode) ||
		event.registrationOpensAt <= new Date()
	) {
		return { ok: false, status: 409, error: 'Only a future scheduled session can be scheduled.' };
	}

	if (!(await transitionEvent(event, event.status, target))) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}

	return { ok: true };
}

export async function postponeRegistration(
	event: MarketEventRow,
	body: unknown,
): Promise<ActionResult> {
	const minutes = Number((body as Record<string, unknown> | null)?.minutes);

	if (
		!canRunSessionCommand(event.status, 'postpone_registration', event.sessionMode) ||
		!Number.isInteger(minutes) ||
		minutes < 1 ||
		minutes > 1440
	) {
		return {
			ok: false,
			status: 409,
			error: 'A scheduled session can only be postponed by a valid number of minutes.',
		};
	}
	const [updated] = await db
		.update(marketEvents)
		.set(postponedWindow(event, minutes))
		.where(and(eq(marketEvents.id, event.id), eq(marketEvents.status, 'scheduled')))
		.returning({ id: marketEvents.id });

	if (!updated) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}

	return { ok: true };
}

export async function openRegistration(event: MarketEventRow): Promise<ActionResult> {
	const target = sessionCommandTarget('open_registration');

	if (!target || !canRunSessionCommand(event.status, 'open_registration', event.sessionMode)) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}
	const now = new Date();
	const window = openingWindow(event, now);
	const { registrationClosesAt } = window;

	if (registrationClosesAt <= now) {
		return { ok: false, status: 409, error: 'Registration must close in the future.' };
	}
	const [updated] = await db
		.update(marketEvents)
		.set({ status: target, registrationGraceEndsAt: null, ...window })
		.where(and(eq(marketEvents.id, event.id), inArray(marketEvents.status, ['draft', 'scheduled'])))
		.returning({ id: marketEvents.id });

	if (!updated) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}

	return { ok: true };
}

export async function reopenRegistration(event: MarketEventRow): Promise<ActionResult> {
	const target = sessionCommandTarget('reopen_registration');

	if (!target || !canRunSessionCommand(event.status, 'reopen_registration', event.sessionMode)) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}
	const minimumClose = new Date(Date.now() + 30 * 60_000);
	const [updated] = await db
		.update(marketEvents)
		.set({
			status: target,
			registrationGraceEndsAt: null,
			registrationClosesAt:
				event.registrationClosesAt > minimumClose ? event.registrationClosesAt : minimumClose,
		})
		.where(and(eq(marketEvents.id, event.id), eq(marketEvents.status, 'registration_closed')))
		.returning({ id: marketEvents.id });

	if (!updated) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}

	return { ok: true };
}

export async function closeSession(event: MarketEventRow): Promise<ActionResult> {
	const target = sessionCommandTarget('close_session');

	if (!target || !canRunSessionCommand(event.status, 'close_session', event.sessionMode)) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}
	// Guests still waiting or called are resolved in the same transaction as the transition, so
	// ending a session never leaves someone in a status that implies service is still coming.
	const closed = await db.transaction(async (tx) => {
		const [updated] = await tx
			.update(marketEvents)
			.set({ status: target })
			.where(and(eq(marketEvents.id, event.id), eq(marketEvents.status, event.status)))
			.returning({ id: marketEvents.id });

		if (!updated) {
			return false;
		}
		await resolveOutstandingVisits(tx, event.id);

		return true;
	});

	if (!closed) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}

	return { ok: true };
}

export async function closeRegistration(event: MarketEventRow): Promise<ActionResult> {
	const target = sessionCommandTarget('close_registration');

	if (!target || !canRunSessionCommand(event.status, 'close_registration', event.sessionMode)) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}
	const closed = await db.transaction(async (tx) => {
		const registrationGraceEndsAt = registrationGraceDeadline({
			registrationClosesAt: new Date(),
		});
		const [updated] = await tx
			.update(marketEvents)
			.set({ status: target, registrationGraceEndsAt })
			.where(and(eq(marketEvents.id, event.id), eq(marketEvents.status, event.status)))
			.returning({ id: marketEvents.id });

		if (!updated) {
			return false;
		}

		if (notificationsEnabled()) {
			const registrations = await tx
				.select({ visitId: visits.id })
				.from(visits)
				.where(and(eq(visits.marketEventId, event.id), eq(visits.status, 'registered')));

			await queueNotification(
				tx,
				registrations.map(({ visitId }) => visitId),
				'registration_closed',
				'registration_closed',
			);
		}

		return true;
	});

	if (!closed) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}

	return { ok: true };
}

export async function runLottery(
	event: MarketEventRow,
	shuffleFn: <T extends { lotteryWeight: number }>(items: T[]) => T[] = weightedShuffle,
): Promise<ActionResult> {
	if (!canRunSessionCommand(event.status, 'run_lottery', event.sessionMode)) {
		return {
			ok: false,
			status: 409,
			error: 'The lottery can only run after the registration grace period ends.',
		};
	}
	const lotteryTarget = sessionCommandTarget('run_lottery');

	if (!lotteryTarget) {
		return { ok: false, status: 500, error: 'The lottery transition is not configured.' };
	}

	const completed = await db
		.transaction(async (tx) => {
			// Registration takes this same row lock before its final eligibility check. Once this
			// transaction observes `lottery_pending`, no late visit can enter the frozen pool.
			const [lockedEvent] = await tx
				.select()
				.from(marketEvents)
				.where(eq(marketEvents.id, event.id))
				.limit(1)
				.for('update');

			if (!lockedEvent || lockedEvent.status !== 'lottery_pending') {
				throw new Error('INVALID_SESSION_TRANSITION');
			}

			const registrations = await tx
				.select({ id: visits.id, lotteryWeight: visits.lotteryWeight })
				.from(visits)
				.where(and(eq(visits.marketEventId, event.id), eq(visits.status, 'registered')));
			const shuffled = shuffleFn(registrations);
			// A worker can place a guest straight into the line before the draw. Those guests are
			// already `waiting`, so they use capacity and the winners queue behind them.
			const [placed] = await tx
				.select({
					count: sql<number>`count(*)::int`,
					highestPosition: sql<number | null>`max(${visits.queuePosition})`,
				})
				.from(visits)
				.where(and(eq(visits.marketEventId, event.id), eq(visits.status, 'waiting')));
			const reservedCount = placed?.count ?? 0;
			const positionOffset = placed?.highestPosition ?? 0;
			const remainingCapacity = Math.max(0, lockedEvent.capacity - reservedCount);
			const selectedRegistrations = shuffled.slice(0, remainingCapacity);
			const selected = selectedRegistrations.map(({ id }) => id);
			const notPlaced = shuffled.slice(remainingCapacity).map(({ id }) => id);

			const [started] = await tx
				.update(marketEvents)
				.set({ status: lotteryTarget })
				.where(and(eq(marketEvents.id, event.id), eq(marketEvents.status, 'lottery_pending')))
				.returning({ id: marketEvents.id });

			if (!started) {
				throw new Error('INVALID_SESSION_TRANSITION');
			}

			if (selected.length) {
				const positions = selectedRegistrations.map(
					(registration, index) =>
						sql`(${registration.id}::uuid, ${index + 1 + positionOffset}::integer)`,
				);

				await tx.execute(sql`
					UPDATE ${visits} AS visit
					SET status = 'waiting', queue_position = positions.position
					FROM (VALUES ${sql.join(positions, sql`, `)}) AS positions(id, position)
					WHERE visit.id = positions.id
				`);

				if (notificationsEnabled()) {
					await queueNotification(tx, selected, 'lottery_selected', 'lottery_selected');
				}
			}

			if (notPlaced.length) {
				await tx.update(visits).set({ status: 'not_placed' }).where(inArray(visits.id, notPlaced));

				if (notificationsEnabled()) {
					await queueNotification(tx, notPlaced, 'lottery_not_selected', 'lottery_not_selected');
				}
			}

			return true;
		})
		.catch((cause: unknown) => {
			if (cause instanceof Error && cause.message === 'INVALID_SESSION_TRANSITION') {
				return false;
			}
			throw cause;
		});

	if (!completed) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}

	return { ok: true };
}
