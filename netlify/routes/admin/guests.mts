import { and, desc, eq, ilike, ne, or, sql } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../../../db/index.mjs';
import { guests, marketEvents, visits } from '../../../db/schema.mjs';
import { visitCommands } from '../../../src/services/visitStateMachine.js';
import { withPermission } from '../../lib/http-auth.mjs';
import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
import { tracedQuery } from '../../lib/sentry.mjs';
import { adminProfileSchema, createGuestProfile } from '../../services/guest-information.mjs';
import { parseSubmission, registerGuest } from '../../services/guestRegistration.mjs';
import { runVisitCommand } from '../../services/visitQueue.mjs';

const visitUpdateSchema = z.object({ id: z.string(), command: z.enum(visitCommands) });

async function currentEventId() {
	const [event] = await tracedQuery('admin_guests.read_event', () =>
		db
			.select({ id: marketEvents.id })
			.from(marketEvents)
			.where(ne(marketEvents.status, 'ended'))
			.orderBy(desc(marketEvents.createdAt))
			.limit(1),
	);

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
		await tracedQuery('admin_guests.list', () =>
			db
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
				// A left join so the whole-database view also lists guests with no visit — every visit
				// column comes back null for them. A session filter still excludes them, as before.
				.leftJoin(visits, eq(visits.guestId, guests.id))
				.where(where)
				.orderBy(desc(sql`coalesce(${visits.createdAt}, ${guests.createdAt})`))
				.limit(eventId ? 10_000 : 100),
		),
	);
}

async function createGuest(request: Request) {
	const body = await jsonBody(request);

	// Decided before the visit schema sees it, which would otherwise read `profile` as `queue`.
	if (
		typeof body === 'object' &&
		body !== null &&
		'admission' in body &&
		body.admission === 'profile'
	) {
		const profile = adminProfileSchema.safeParse(body);

		return profile.success
			? Response.json(await createGuestProfile(profile.data), { status: 201 })
			: jsonError('Please provide a valid name and phone number.');
	}

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
	const update = visitUpdateSchema.safeParse(await jsonBody(request));

	if (!update.success) {
		return jsonError('Invalid guest update.');
	}

	const result = await runVisitCommand(update.data.id, update.data.command);

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
