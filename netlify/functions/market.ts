import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { guests, marketEvents, registrationQuestions } from '../../db/schema.js';

type QuestionInput = { prompt: string; type: 'text' | 'scale'; required: boolean };

function error(message: string, status = 400) {
	return Response.json({ error: message }, { status });
}

async function getCurrentEvent() {
	const [event] = await db
		.select()
		.from(marketEvents)
		.orderBy(desc(marketEvents.createdAt))
		.limit(1);

	return event ?? null;
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

function parseSettings(value: unknown) {
	if (!value || typeof value !== 'object') {
		return null;
	}
	const body = value as Record<string, unknown>;
	const registrationOpensAt = new Date(String(body.registrationOpensAt));
	const registrationClosesAt = new Date(String(body.registrationClosesAt));
	const capacity = Number(body.capacity);
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

	return { registrationOpensAt, registrationClosesAt, capacity, questions };
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
	await db.transaction(async (tx) => {
		let event: typeof marketEvents.$inferSelect;

		if (current && current.status !== 'drawn') {
			const [updated] = await tx
				.update(marketEvents)
				.set({
					registrationOpensAt: settings.registrationOpensAt,
					registrationClosesAt: settings.registrationClosesAt,
					capacity: settings.capacity,
				})
				.where(eq(marketEvents.id, current.id))
				.returning();
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
	});

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

	if (action === 'close') {
		await db.update(marketEvents).set({ status: 'closed' }).where(eq(marketEvents.id, event.id));

		return marketOverview();
	}
	if (action !== 'draw') {
		return error('Invalid market action.');
	}
	if (event.status === 'drawn') {
		return error('The lottery has already been drawn.', 409);
	}

	const registrations = await db
		.select({ id: guests.id })
		.from(guests)
		.where(and(eq(guests.marketEventId, event.id), eq(guests.status, 'registered')));
	const shuffled = shuffle(registrations);
	const selected = shuffled.slice(0, event.capacity).map(({ id }) => id);
	const notPlaced = shuffled.slice(event.capacity).map(({ id }) => id);

	await db.transaction(async (tx) => {
		if (selected.length) {
			await tx.update(guests).set({ status: 'waiting' }).where(inArray(guests.id, selected));
		}
		if (notPlaced.length) {
			await tx.update(guests).set({ status: 'not_placed' }).where(inArray(guests.id, notPlaced));
		}
		await tx.update(marketEvents).set({ status: 'drawn' }).where(eq(marketEvents.id, event.id));
	});

	return marketOverview();
}

export default async (request: Request) => {
	if (request.method === 'GET') {
		return marketOverview();
	}
	if (request.method === 'PUT') {
		return saveSettings(request);
	}
	if (request.method === 'POST') {
		return runAction(request);
	}

	return error('Method not allowed', 405);
};

export const config = { path: '/api/market' };
