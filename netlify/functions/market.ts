import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { guests, marketEvents, registrationQuestions } from '../../db/schema.js';
import { requireAuth0 } from '../lib/auth.js';

type QuestionInput = { prompt: string; type: 'text' | 'scale'; required: boolean };
type SessionMode = 'scheduled' | 'ad_hoc';

function error(message: string, status = 400) {
	return Response.json({ error: message }, { status });
}

async function getLatestActiveEvent() {
	const [event] = await db
		.select()
		.from(marketEvents)
		.where(ne(marketEvents.status, 'ended'))
		.orderBy(desc(marketEvents.createdAt))
		.limit(1);

	return event ?? null;
}

async function getCurrentEvent() {
	let event = await getLatestActiveEvent();
	if (!event) {
		return null;
	}

	const now = new Date();
	if (event.status === 'scheduled' && event.registrationOpensAt <= now) {
		const [opened] = await db
			.update(marketEvents)
			.set({ status: 'registration_open' })
			.where(and(eq(marketEvents.id, event.id), eq(marketEvents.status, 'scheduled')))
			.returning();
		event = opened ?? (await getLatestActiveEvent()) ?? event;
	}
	if (event.status === 'registration_open' && event.registrationClosesAt <= now) {
		const [closed] = await db
			.update(marketEvents)
			.set({ status: 'registration_closed' })
			.where(and(eq(marketEvents.id, event.id), eq(marketEvents.status, 'registration_open')))
			.returning();
		event = closed ?? (await getLatestActiveEvent()) ?? event;
	}

	return event;
}

async function marketOverview() {
	const event = await getCurrentEvent();
	if (!event) {
		return Response.json({ event: null, questions: [], counts: {} });
	}

	const questions = await db
		.select()
		.from(registrationQuestions)
		.where(eq(registrationQuestions.marketEventId, event.id))
		.orderBy(asc(registrationQuestions.position));
	const rows = await db
		.select({ status: guests.status, count: sql<number>`count(*)::int` })
		.from(guests)
		.where(eq(guests.marketEventId, event.id))
		.groupBy(guests.status);

	return Response.json({
		event,
		questions,
		counts: Object.fromEntries(rows.map((row) => [row.status, row.count])),
	});
}

async function marketHistory() {
	const events = await db
		.select()
		.from(marketEvents)
		.where(eq(marketEvents.status, 'ended'))
		.orderBy(desc(marketEvents.createdAt))
		.limit(100);
	if (!events.length) {
		return Response.json([]);
	}

	const rows = await db
		.select({ marketEventId: guests.marketEventId, count: sql<number>`count(*)::int` })
		.from(guests)
		.where(
			inArray(
				guests.marketEventId,
				events.map(({ id }) => id),
			),
		)
		.groupBy(guests.marketEventId);
	const guestCounts = new Map(rows.map((row) => [row.marketEventId, row.count]));

	return Response.json(
		events.map((event) => ({
			...event,
			guestCount: guestCounts.get(event.id) ?? 0,
		})),
	);
}

function parseSettings(value: unknown) {
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

async function saveSettings(request: Request) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return error('Request body must be valid JSON.');
	}
	const settings = parseSettings(body);
	if (!settings) {
		return error('Please provide valid lottery settings.');
	}

	const current = await getCurrentEvent();
	if (current && current.status !== 'draft') {
		return error('Session settings can only be changed before registration opens.', 409);
	}
	const saved = await db
		.transaction(async (tx) => {
			let event: typeof marketEvents.$inferSelect;

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
		return error('Session settings can only be changed before registration opens.', 409);
	}

	return marketOverview();
}

function shuffle<T>(items: T[]) {
	for (let index = items.length - 1; index > 0; index -= 1) {
		const random = crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32;
		const swapIndex = Math.floor(random * (index + 1));
		[items[index], items[swapIndex]] = [items[swapIndex]!, items[index]!];
	}

	return items;
}

function parseRegistrationOverride(value: unknown) {
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

async function transitionEvent(event: typeof marketEvents.$inferSelect, from: string, to: string) {
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

async function runAction(request: Request) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return error('Request body must be valid JSON.');
	}
	const action = (body as { action?: unknown } | null)?.action;
	const event = await getCurrentEvent();
	if (!event) {
		return error('No market event has been configured.', 409);
	}
	if (action === 'reset_session') {
		const [reset] = await db
			.update(marketEvents)
			.set({ status: 'ended' })
			.where(and(eq(marketEvents.id, event.id), ne(marketEvents.status, 'ended')))
			.returning({ id: marketEvents.id });
		if (!reset) {
			return error('The current session could not be reset.', 409);
		}

		return marketOverview();
	}

	if (action === 'update_registration') {
		const override = parseRegistrationOverride(body);
		if (
			!override ||
			override.registrationClosesAt < event.registrationClosesAt ||
			override.registrationClosesAt <= event.registrationOpensAt
		) {
			return error('Please provide valid registration overrides.');
		}
		const [updated] = await db
			.update(marketEvents)
			.set(override)
			.where(and(eq(marketEvents.id, event.id), eq(marketEvents.status, 'registration_open')))
			.returning({ id: marketEvents.id });
		if (!updated) {
			return error('Registration overrides are only available while registration is open.', 409);
		}

		return marketOverview();
	}
	if (action === 'schedule_registration') {
		if (
			event.status !== 'draft' ||
			event.sessionMode !== 'scheduled' ||
			event.registrationOpensAt <= new Date()
		) {
			return error('Only a future scheduled session can be scheduled.', 409);
		}
		if (!(await transitionEvent(event, 'draft', 'scheduled'))) {
			return error('That session transition is not allowed from the current state.', 409);
		}

		return marketOverview();
	}
	if (action === 'postpone_registration') {
		const minutes = Number((body as Record<string, unknown>).minutes);
		if (
			event.status !== 'scheduled' ||
			!Number.isInteger(minutes) ||
			minutes < 1 ||
			minutes > 1440
		) {
			return error('A scheduled session can only be postponed by a valid number of minutes.', 409);
		}
		const [updated] = await db
			.update(marketEvents)
			.set({
				registrationOpensAt: new Date(event.registrationOpensAt.valueOf() + minutes * 60_000),
				registrationClosesAt: new Date(event.registrationClosesAt.valueOf() + minutes * 60_000),
			})
			.where(and(eq(marketEvents.id, event.id), eq(marketEvents.status, 'scheduled')))
			.returning({ id: marketEvents.id });
		if (!updated) {
			return error('That session transition is not allowed from the current state.', 409);
		}

		return marketOverview();
	}
	if (action === 'open_registration') {
		if (event.status !== 'draft' && event.status !== 'scheduled') {
			return error('That session transition is not allowed from the current state.', 409);
		}
		const now = new Date();
		const registrationClosesAt =
			event.sessionMode === 'scheduled'
				? new Date(
						now.valueOf() +
							(event.registrationClosesAt.valueOf() - event.registrationOpensAt.valueOf()),
					)
				: event.registrationClosesAt;
		if (registrationClosesAt <= now) {
			return error('Registration must close in the future.', 409);
		}
		const [updated] = await db
			.update(marketEvents)
			.set({
				status: 'registration_open',
				registrationOpensAt: now,
				registrationClosesAt,
			})
			.where(
				and(eq(marketEvents.id, event.id), inArray(marketEvents.status, ['draft', 'scheduled'])),
			)
			.returning({ id: marketEvents.id });
		if (!updated) {
			return error('That session transition is not allowed from the current state.', 409);
		}

		return marketOverview();
	}
	if (action === 'reopen_registration') {
		if (event.status !== 'registration_closed') {
			return error('That session transition is not allowed from the current state.', 409);
		}
		const minimumClose = new Date(Date.now() + 30 * 60_000);
		const [updated] = await db
			.update(marketEvents)
			.set({
				status: 'registration_open',
				registrationClosesAt:
					event.registrationClosesAt > minimumClose ? event.registrationClosesAt : minimumClose,
			})
			.where(and(eq(marketEvents.id, event.id), eq(marketEvents.status, 'registration_closed')))
			.returning({ id: marketEvents.id });
		if (!updated) {
			return error('That session transition is not allowed from the current state.', 409);
		}

		return marketOverview();
	}

	const transitions = {
		close_registration: ['registration_open', 'registration_closed'],
		close_session: ['service_started', 'ended'],
	} as const;
	if (typeof action === 'string' && action in transitions) {
		const [from, to] = transitions[action as keyof typeof transitions];
		if (!(await transitionEvent(event, from, to))) {
			return error('That session transition is not allowed from the current state.', 409);
		}

		return marketOverview();
	}
	if (action !== 'run_lottery') {
		return error('Invalid market action.');
	}
	if (event.status !== 'registration_closed') {
		return error('The lottery can only run after registration closes.', 409);
	}
	const registrations = await db
		.select({ id: guests.id })
		.from(guests)
		.where(and(eq(guests.marketEventId, event.id), eq(guests.status, 'registered')));
	const shuffled = shuffle(registrations);
	const selected = shuffled.slice(0, event.capacity).map(({ id }) => id);
	const notPlaced = shuffled.slice(event.capacity).map(({ id }) => id);

	await db
		.transaction(async (tx) => {
			const [started] = await tx
				.update(marketEvents)
				.set({ status: 'service_started' })
				.where(and(eq(marketEvents.id, event.id), eq(marketEvents.status, 'registration_closed')))
				.returning({ id: marketEvents.id });
			if (!started) {
				throw new Error('INVALID_SESSION_TRANSITION');
			}
			if (selected.length) {
				await tx.update(guests).set({ status: 'waiting' }).where(inArray(guests.id, selected));
			}
			if (notPlaced.length) {
				await tx.update(guests).set({ status: 'not_placed' }).where(inArray(guests.id, notPlaced));
			}
		})
		.catch((cause: unknown) => {
			if (cause instanceof Error && cause.message === 'INVALID_SESSION_TRANSITION') {
				return null;
			}
			throw cause;
		});
	const refreshed = await getCurrentEvent();
	if (refreshed?.status !== 'service_started') {
		return error('That session transition is not allowed from the current state.', 409);
	}

	return marketOverview();
}

export default async (request: Request) => {
	if (request.method === 'GET') {
		if (new URL(request.url).searchParams.get('view') === 'history') {
			const unauthorized = await requireAuth0(request);
			if (unauthorized) {
				return unauthorized;
			}

			return marketHistory();
		}

		return marketOverview();
	}
	if (request.method === 'PUT') {
		const unauthorized = await requireAuth0(request);
		if (unauthorized) {
			return unauthorized;
		}

		return saveSettings(request);
	}
	if (request.method === 'POST') {
		const unauthorized = await requireAuth0(request);
		if (unauthorized) {
			return unauthorized;
		}

		return runAction(request);
	}

	return error('Method not allowed', 405);
};

export const config = { path: '/api/market' };
