import { and, desc, eq, ilike, ne, or } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { guests, marketEvents, registrationQuestions } from '../../db/schema.js';
import { requireAuth0 } from '../lib/auth.js';

const locales = ['en', 'es', 'fa', 'tl', 'vi', 'zh', 'ar'] as const;
const statuses = ['registered', 'waiting', 'served', 'not_placed', 'no_show'] as const;

type GuestSubmission = {
	firstName: string;
	lastName: string;
	age: number;
	householdSize: number;
	phone: string;
	locale: (typeof locales)[number];
	marketEventId: string | null;
	answers: Record<string, string | number>;
	source: 'self' | 'admin';
};

function error(message: string, status = 400) {
	return Response.json({ error: message }, { status });
}

function isAnswers(value: unknown): value is Record<string, string | number> {
	return (
		!!value &&
		typeof value === 'object' &&
		Object.values(value).every((answer) => typeof answer === 'string' || typeof answer === 'number')
	);
}

function parseSubmission(value: unknown): GuestSubmission | null {
	if (!value || typeof value !== 'object') {
		return null;
	}

	const body = value as Record<string, unknown>;
	const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
	const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
	const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
	const age = Number(body.age);
	const householdSize = Number(body.householdSize);
	const locale = body.locale;
	const source = body.source === 'admin' ? 'admin' : 'self';
	const marketEventId = typeof body.marketEventId === 'string' ? body.marketEventId : null;
	const answers = body.answers ?? {};

	if (
		!firstName ||
		!lastName ||
		!phone ||
		firstName.length > 100 ||
		lastName.length > 100 ||
		phone.length > 40 ||
		!Number.isInteger(age) ||
		age < 0 ||
		age > 120 ||
		!Number.isInteger(householdSize) ||
		householdSize < 1 ||
		householdSize > 30 ||
		!locales.some((item) => item === locale) ||
		!isAnswers(answers)
	) {
		return null;
	}

	return {
		firstName,
		lastName,
		age,
		householdSize,
		phone,
		locale: locale as GuestSubmission['locale'],
		marketEventId,
		answers,
		source,
	};
}

async function currentEventId() {
	const [event] = await db
		.select({ id: marketEvents.id })
		.from(marketEvents)
		.where(ne(marketEvents.status, 'ended'))
		.orderBy(desc(marketEvents.createdAt))
		.limit(1);

	return event?.id ?? null;
}

async function listGuests(request: Request) {
	const url = new URL(request.url);
	const query = url.searchParams.get('q')?.trim() ?? '';
	const eventId =
		url.searchParams.get('scope') === 'all'
			? null
			: (url.searchParams.get('marketEventId') ?? (await currentEventId()));
	const eventFilter = eventId ? eq(guests.marketEventId, eventId) : undefined;
	const searchFilter = query
		? or(
				ilike(guests.firstName, `%${query}%`),
				ilike(guests.lastName, `%${query}%`),
				ilike(guests.phone, `%${query}%`),
			)
		: undefined;
	const where =
		eventFilter && searchFilter ? and(eventFilter, searchFilter) : (eventFilter ?? searchFilter);

	return Response.json(
		await db
			.select()
			.from(guests)
			.where(where)
			.orderBy(desc(guests.createdAt))
			.limit(eventId ? 10_000 : 100),
	);
}

async function createGuest(request: Request) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return error('Request body must be valid JSON.');
	}

	const submission = parseSubmission(body);
	if (!submission) {
		return error('Please provide valid guest information.');
	}
	if (submission.source === 'admin') {
		const unauthorized = await requireAuth0(request);
		if (unauthorized) {
			return unauthorized;
		}
	}
	if (submission.source === 'admin' && !submission.marketEventId) {
		return error('No market event has been configured.', 409);
	}
	if (submission.source === 'admin') {
		const [event] = await db
			.select({ status: marketEvents.status })
			.from(marketEvents)
			.where(eq(marketEvents.id, submission.marketEventId!))
			.limit(1);
		if (event?.status !== 'service_started') {
			return error('Guests can only be added to the queue after service starts.', 409);
		}
	}

	if (submission.source === 'self') {
		if (!submission.marketEventId) {
			return error('Registration is not open.', 409);
		}
		const [event] = await db
			.select()
			.from(marketEvents)
			.where(eq(marketEvents.id, submission.marketEventId))
			.limit(1);
		const now = new Date();
		const registrationStateIsOpen =
			event?.status === 'registration_open' ||
			(event?.status === 'scheduled' && now >= event.registrationOpensAt);
		if (
			!event ||
			!registrationStateIsOpen ||
			now < event.registrationOpensAt ||
			now > event.registrationClosesAt
		) {
			return error('Registration is not open.', 409);
		}

		const questions = await db
			.select({
				id: registrationQuestions.id,
				type: registrationQuestions.type,
				required: registrationQuestions.required,
			})
			.from(registrationQuestions)
			.where(eq(registrationQuestions.marketEventId, submission.marketEventId));
		for (const question of questions) {
			const answer = submission.answers[question.id];
			if (question.required && (answer === undefined || answer === '')) {
				return error('Please answer all required registration questions.');
			}
			if (
				question.type === 'scale' &&
				answer !== undefined &&
				(!Number.isInteger(answer) || Number(answer) < 1 || Number(answer) > 10)
			) {
				return error('Please provide valid registration answers.');
			}
		}
	}

	const [guest] = await db
		.insert(guests)
		.values({
			...submission,
			status: submission.source === 'admin' ? 'waiting' : 'registered',
		})
		.returning({ id: guests.id });

	return Response.json(guest, { status: 201 });
}

async function updateGuest(request: Request) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return error('Request body must be valid JSON.');
	}
	if (!body || typeof body !== 'object') {
		return error('Invalid guest update.');
	}

	const { id, status } = body as Record<string, unknown>;
	if (
		typeof id !== 'string' ||
		typeof status !== 'string' ||
		!statuses.some((item) => item === status)
	) {
		return error('Invalid guest update.');
	}

	const [guest] = await db
		.update(guests)
		.set({ status })
		.where(eq(guests.id, id))
		.returning({ id: guests.id, status: guests.status });

	return guest ? Response.json(guest) : error('Guest not found.', 404);
}

export default async (request: Request) => {
	if (request.method === 'GET') {
		const unauthorized = await requireAuth0(request);
		if (unauthorized) {
			return unauthorized;
		}

		return listGuests(request);
	}
	if (request.method === 'POST') {
		return createGuest(request);
	}
	if (request.method === 'PATCH') {
		const unauthorized = await requireAuth0(request);
		if (unauthorized) {
			return unauthorized;
		}

		return updateGuest(request);
	}

	return error('Method not allowed', 405);
};

export const config = { path: '/api/guests' };
