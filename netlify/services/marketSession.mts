import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../../db/index.mjs';
import { marketEvents, registrationQuestions, visits } from '../../db/schema.mjs';
import { SessionTimeline } from '../../src/models/session-timeline.js';
import {
	canRunSessionCommand,
	sessionCommandTarget,
	type SessionStatus,
} from '../../src/services/sessionStateMachine.js';
import { tracedQuery } from '../lib/sentry.mjs';
import { scheduleRegistrationClose } from './marketLifecycleEvents.mjs';
import { requestNotificationDispatch } from './notificationDispatch.mjs';
import { queueNotification } from './notifications.mjs';
import { notificationsEnabled } from './pushNotifications.mjs';
import { resolveOutstandingVisits } from './visitQueue.mjs';

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

/** ISO strings as the admin console sends them; a `Date` passes straight through for server callers. */
const timestampSchema = z.union([z.string(), z.date()]).pipe(z.coerce.date());

/** Matches the `market_events_capacity_check` constraint in the database. */
const capacitySchema = z.coerce.number().int().min(1).max(10_000);

const questionSchema = z.object({
	prompt: z.string().trim().min(1).max(300),
	// A type the console does not recognise still has to render as something a guest can answer.
	type: z.enum(['text', 'scale']).catch('text'),
	required: z.boolean().catch(false),
});

export type QuestionInput = z.infer<typeof questionSchema>;

const settingsSchema = z
	.object({
		registrationOpensAt: timestampSchema,
		registrationClosesAt: timestampSchema,
		capacity: capacitySchema,
		// A session is scheduled unless it explicitly says otherwise.
		sessionMode: z.enum(['ad_hoc', 'scheduled']).catch('scheduled'),
		questions: z.array(questionSchema),
	})
	.refine((settings) => settings.registrationClosesAt > settings.registrationOpensAt, {
		path: ['registrationClosesAt'],
		error: 'Registration must close after it opens.',
	});

export type ParsedSettings = z.infer<typeof settingsSchema>;

export function parseSettings(value: unknown): ParsedSettings | null {
	return settingsSchema.safeParse(value).data ?? null;
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
	const saved = await tracedQuery('market_session.save_settings', () =>
		db
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
			}),
	);

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

/** What a worker can still change once registration is open: how long, and for how many. */
const registrationOverrideSchema = z.object({
	registrationClosesAt: timestampSchema,
	capacity: capacitySchema,
});

export function parseRegistrationOverride(value: unknown) {
	return registrationOverrideSchema.safeParse(value).data ?? null;
}

/** A scheduled session can slip by up to a day; anything longer should be rescheduled instead. */
const postponementSchema = z.object({ minutes: z.coerce.number().int().min(1).max(1440) });

async function transitionEvent(event: MarketEventRow, from: SessionStatus, to: SessionStatus) {
	if (event.status !== from) {
		return false;
	}
	const [updated] = await tracedQuery('market_session.transition', () =>
		db
			.update(marketEvents)
			.set({ status: to })
			.where(and(eq(marketEvents.id, event.id), eq(marketEvents.status, from)))
			.returning({ id: marketEvents.id }),
	);

	return Boolean(updated);
}

export async function resetSession(event: MarketEventRow): Promise<ActionResult> {
	const target = sessionCommandTarget('reset_session');

	if (!target || !canRunSessionCommand(event.status, 'reset_session', event.sessionMode)) {
		return { ok: false, status: 409, error: 'The current session could not be reset.' };
	}
	const [reset] = await tracedQuery('market_session.reset', () =>
		db
			.update(marketEvents)
			.set({ status: target })
			.where(and(eq(marketEvents.id, event.id), ne(marketEvents.status, 'ended')))
			.returning({ id: marketEvents.id }),
	);

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
	const [updated] = await tracedQuery('market_session.update_registration', () =>
		db
			.update(marketEvents)
			.set(override)
			.where(and(eq(marketEvents.id, event.id), eq(marketEvents.status, 'registration_open')))
			.returning({ id: marketEvents.id, registrationClosesAt: marketEvents.registrationClosesAt }),
	);

	if (!updated) {
		return {
			ok: false,
			status: 409,
			error: 'Registration overrides are only available while registration is open.',
		};
	}

	await scheduleRegistrationClose(updated);

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

	await scheduleRegistrationClose(event);

	return { ok: true };
}

export async function postponeRegistration(
	event: MarketEventRow,
	body: unknown,
): Promise<ActionResult> {
	const postponement = postponementSchema.safeParse(body);

	if (
		!canRunSessionCommand(event.status, 'postpone_registration', event.sessionMode) ||
		!postponement.success
	) {
		return {
			ok: false,
			status: 409,
			error: 'A scheduled session can only be postponed by a valid number of minutes.',
		};
	}
	const [updated] = await tracedQuery('market_session.postpone_registration', () =>
		db
			.update(marketEvents)
			.set(new SessionTimeline(event).postponedWindow(postponement.data.minutes))
			.where(and(eq(marketEvents.id, event.id), eq(marketEvents.status, 'scheduled')))
			.returning({ id: marketEvents.id, registrationClosesAt: marketEvents.registrationClosesAt }),
	);

	if (!updated) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}

	await scheduleRegistrationClose(updated);

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
	const window = new SessionTimeline(event).openingWindow(now);
	const { registrationClosesAt } = window;

	if (registrationClosesAt <= now) {
		return { ok: false, status: 409, error: 'Registration must close in the future.' };
	}
	const [updated] = await tracedQuery('market_session.open_registration', () =>
		db
			.update(marketEvents)
			.set({ status: target, registrationGraceEndsAt: null, ...window })
			.where(
				and(eq(marketEvents.id, event.id), inArray(marketEvents.status, ['draft', 'scheduled'])),
			)
			.returning({ id: marketEvents.id, registrationClosesAt: marketEvents.registrationClosesAt }),
	);

	if (!updated) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}

	await scheduleRegistrationClose(updated);

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
	const [updated] = await tracedQuery('market_session.reopen_registration', () =>
		db
			.update(marketEvents)
			.set({
				status: target,
				registrationGraceEndsAt: null,
				registrationClosesAt:
					event.registrationClosesAt > minimumClose ? event.registrationClosesAt : minimumClose,
			})
			.where(and(eq(marketEvents.id, event.id), eq(marketEvents.status, 'registration_closed')))
			.returning({ id: marketEvents.id, registrationClosesAt: marketEvents.registrationClosesAt }),
	);

	if (!updated) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}

	await scheduleRegistrationClose(updated);

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
	const closed = await tracedQuery('market_session.close_session', () =>
		db.transaction(async (tx) => {
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
		}),
	);

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
	const closed = await tracedQuery('market_session.close_registration', () =>
		db.transaction(async (tx) => {
			const registrationGraceEndsAt = SessionTimeline.graceDeadlineAfter(new Date());
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
		}),
	);

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

	const completed = await tracedQuery('market_session.run_lottery', () =>
		db
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
					await tx
						.update(visits)
						.set({ status: 'not_placed' })
						.where(inArray(visits.id, notPlaced));

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
			}),
	);

	if (!completed) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}

	return { ok: true };
}
