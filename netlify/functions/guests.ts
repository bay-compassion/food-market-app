import { and, desc, eq, ilike, ne, or } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { guests, marketEvents, notificationDeliveries, visits } from '../../db/schema.js';
import { requireAuth0 } from '../lib/auth.js';
import { parseSubmission, registerGuest } from '../services/guestRegistration.js';
import {
	deliverPendingNotifications,
	notificationsEnabled,
} from '../services/pushNotifications.js';

const statuses = [
	'registered',
	'waiting',
	'called',
	'served',
	'not_placed',
	'no_show',
	'cancelled',
] as const;

function error(message: string, status = 400) {
	return Response.json({ error: message }, { status });
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
	const eventFilter = eventId ? eq(visits.marketEventId, eventId) : undefined;
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
			.select({
				id: visits.id,
				guestId: guests.id,
				marketEventId: visits.marketEventId,
				firstName: guests.firstName,
				lastName: guests.lastName,
				age: guests.age,
				householdSize: guests.householdSize,
				phone: guests.phone,
				locale: guests.locale,
				status: visits.status,
				queuePosition: visits.queuePosition,
				calledAt: visits.calledAt,
				answers: visits.answers,
				source: visits.source,
				visitDate: visits.visitDate,
				isFirstVisit: visits.isFirstVisit,
				createdAt: visits.createdAt,
			})
			.from(guests)
			.innerJoin(visits, eq(visits.guestId, guests.id))
			.where(where)
			.orderBy(desc(visits.createdAt))
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

	const result = await registerGuest(submission);

	return result.ok
		? Response.json(result.body, { status: result.status })
		: error(result.error, result.status);
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

	// Only the transition into 'called' is guarded (must come from 'waiting'). Every other
	// target status can be set from any prior status by an authenticated admin — a known gap,
	// tracked as a follow-up rather than fixed here (see docs/migrations.md sibling test notes
	// in netlify/functions/guests.test.ts and push-subscription.test.ts for the same pattern).
	const visit = await db.transaction(async (tx) => {
		const [updated] = await tx
			.update(visits)
			.set(status === 'called' ? { status, calledAt: new Date() } : { status })
			.where(
				status === 'called'
					? and(eq(visits.id, id), eq(visits.status, 'waiting'))
					: eq(visits.id, id),
			)
			.returning({ id: visits.id, status: visits.status });
		if (updated && status === 'called' && notificationsEnabled()) {
			await tx
				.insert(notificationDeliveries)
				.values({ visitId: updated.id, type: 'called', dedupeKey: 'called' })
				.onConflictDoNothing();
		}

		return updated ?? null;
	});
	if (visit && status === 'called' && notificationsEnabled()) {
		await deliverPendingNotifications({ visitIds: [visit.id], types: ['called'], limit: 1 });
	}

	return visit ? Response.json(visit) : error('Visit not found.', 404);
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
