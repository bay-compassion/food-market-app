import { and, desc, eq, ilike, ne, or } from 'drizzle-orm';

import { db } from '../../../db/index.mjs';
import { guests, marketEvents, visits } from '../../../db/schema.mjs';
import { isVisitCommand } from '../../../src/services/visitStateMachine.js';
import { withPermission } from '../../lib/http-auth.mjs';
import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
import { parseSubmission, registerGuest } from '../../services/guestRegistration.mjs';
import { runVisitCommand } from '../../services/visitQueue.mjs';

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
				ageRange: visits.ageRange,
				householdSize: visits.householdSize,
				childrenCount: visits.childrenCount,
				seniorsCount: visits.seniorsCount,
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
	const body = await jsonBody(request);

	const submission = parseSubmission(body);

	if (!submission || submission.source !== 'admin') {
		return jsonError('Please provide a valid administrative guest registration.');
	}

	const result = await registerGuest(submission);

	return result.ok
		? Response.json(result.body, { status: result.status })
		: jsonError(result.error, result.status);
}

async function updateGuest(request: Request) {
	const body = await jsonBody(request);

	if (!body || typeof body !== 'object') {
		return jsonError('Invalid guest update.');
	}

	const { id, command } = body as Record<string, unknown>;

	if (typeof id !== 'string' || !isVisitCommand(command)) {
		return jsonError('Invalid guest update.');
	}

	const result = await runVisitCommand(id, command);

	return result.ok ? Response.json(result.visit) : jsonError(result.error, result.status);
}

export const guestRoutes = createRouter();

guestRoutes.get('/guests', withPermission('run:queue'), (context) => listGuests(context.req.raw));
guestRoutes.post('/guests', withPermission('run:queue'), (context) => createGuest(context.req.raw));
guestRoutes.patch('/guests', withPermission('run:queue'), (context) =>
	updateGuest(context.req.raw),
);
guestRoutes.all('/guests', methodNotAllowed);

export default routeHandler(createRouter().route('/api/admin', guestRoutes));
