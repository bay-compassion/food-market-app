import { and, desc, eq, ilike, ne, or, sql } from 'drizzle-orm';
import type { Context } from 'hono';
import { z } from 'zod';

import { db } from '../../../db/index.mjs';
import { guests, marketEvents, visits } from '../../../db/schema.mjs';
import type { Permission } from '../../../src/services/permissions.js';
import { visitCommands } from '../../../src/services/visitStateMachine.js';
import { withPermission, workerActor, type AdminEnv } from '../../lib/http-auth.mjs';
import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
import { getLogger } from '../../lib/logging.mjs';
import { tracedQuery } from '../../lib/sentry.mjs';
import { GuestDeletion } from '../../services/guest-deletion.mjs';
import {
	adminProfileSchema,
	createGuestProfile,
	staffGuestDetailsSchema,
	updateStaffGuestDetails,
} from '../../services/guest-information.mjs';
import { registerGuest, validateSubmission } from '../../services/guestRegistration.mjs';
import { runVisitCommand } from '../../services/visitQueue.mjs';

const visitUpdateSchema = z.object({
	id: z.string(),
	command: z.enum(visitCommands),
	/** Where `return_to_queue` puts the guest; without one they go back to the place they had. */
	placement: z.enum(['next', 'end']).optional(),
});

const guestIdSchema = z.uuid();

/** The phone number an admin typed to confirm a deletion; the server checks it, not just the form. */
const guestDeletionSchema = z.object({ phone: z.string().min(1) });

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

/**
 * Which permission a guest-list read needs. `run:queue` covers a worker's daily screen — the
 * current session's roster, whether named explicitly or left to default. Reading the whole
 * database (`scope=all`) or any other session's guests is historical, cross-session PII, so it
 * takes the same gate as the bulk export (`export:guest-data`) rather than being handed to every
 * volunteer running the queue.
 */
async function guestListPermission(request: Request): Promise<Permission> {
	const url = new URL(request.url);

	if (url.searchParams.get('scope') === 'all') {
		return 'export:guest-data';
	}

	const requested = url.searchParams.get('marketEventId');

	return requested !== null && requested !== (await currentEventId())
		? 'export:guest-data'
		: 'run:queue';
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
					pronunciation: guests.pronunciation,
					staffNotes: guests.staffNotes,
					ageRange: visits.ageRange,
					householdSize: visits.householdSize,
					childrenCount: visits.childrenCount,
					seniorsCount: visits.seniorsCount,
					phone: guests.phone,
					locale: guests.locale,
					status: visits.status,
					queuePosition: visits.queuePosition,
					priorityNumber: visits.priorityNumber,
					queueFront: visits.queueFront,
					queueOrder: visits.queueOrder,
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

async function createGuest(context: Context<AdminEnv>) {
	const body = await jsonBody(context.req.raw);

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

	const validation = validateSubmission(body);

	if (!validation.success) {
		return Response.json({ error: validation.error, fields: validation.fields }, { status: 400 });
	}

	const submission = validation.data;

	if (submission.source !== 'admin') {
		return jsonError('Please provide a valid administrative guest registration.');
	}

	const result = await registerGuest(submission, workerActor(context));

	return result.ok
		? Response.json(result.body, { status: result.status })
		: jsonError(result.error, result.status);
}

async function updateGuest(context: Context<AdminEnv>) {
	const update = visitUpdateSchema.safeParse(await jsonBody(context.req.raw));

	if (!update.success) {
		return jsonError('Invalid guest update.');
	}

	const { id, command, placement } = update.data;
	const result = await runVisitCommand(id, command, { placement, actor: workerActor(context) });

	return result.ok ? Response.json(result.visit) : jsonError(result.error, result.status);
}

async function updateGuestDetails(context: Context<AdminEnv>) {
	const guestId = guestIdSchema.safeParse(context.req.param('guestId'));
	const details = staffGuestDetailsSchema.safeParse(await jsonBody(context.req.raw));

	if (!guestId.success || !details.success) {
		return jsonError('Invalid guest details.');
	}

	const updated = await updateStaffGuestDetails(guestId.data, details.data);

	return updated ? Response.json(updated) : jsonError('Guest not found.', 404);
}

async function previewGuestDeletion(context: Context<AdminEnv>) {
	const guestId = guestIdSchema.safeParse(context.req.param('guestId'));

	if (!guestId.success) {
		return jsonError('Invalid guest.');
	}

	const preview = await tracedQuery('admin_guests.deletion_preview', () =>
		new GuestDeletion(db, guestId.data).preview(),
	);

	return preview ? Response.json(preview) : jsonError('Guest not found.', 404);
}

async function deleteGuest(context: Context<AdminEnv>) {
	const guestId = guestIdSchema.safeParse(context.req.param('guestId'));
	const confirmation = guestDeletionSchema.safeParse(await jsonBody(context.req.raw));

	if (!guestId.success || !confirmation.success) {
		return jsonError('Type the guest’s phone number to confirm.');
	}

	const result = await tracedQuery('admin_guests.delete', () =>
		new GuestDeletion(db, guestId.data).delete(confirmation.data.phone),
	);

	if (!result.ok) {
		return jsonError(result.error, result.status);
	}

	// The deletion takes the guest's visit history with it, so this line is the only record that it
	// happened. The id and the worker, never the guest's details.
	getLogger().info({
		message: 'guest.deleted',
		guestId: guestId.data,
		actor: context.get('actor'),
	});

	return new Response(null, { status: 204 });
}

export const guestRoutes = createRouter<AdminEnv>();

guestRoutes.get(
	'/guests',
	async (context, next) =>
		withPermission(await guestListPermission(context.req.raw))(context, next),
	(context) => listGuests(context.req.raw),
);
guestRoutes.post('/guests', withPermission('run:queue'), (context) => createGuest(context));
guestRoutes.patch('/guests', withPermission('run:queue'), (context) => updateGuest(context));
guestRoutes.all('/guests', methodNotAllowed);
guestRoutes.patch('/guests/:guestId', withPermission('run:queue'), (context) =>
	updateGuestDetails(context),
);
guestRoutes.delete('/guests/:guestId', withPermission('delete:guest-data'), (context) =>
	deleteGuest(context),
);
guestRoutes.all('/guests/:guestId', methodNotAllowed);
guestRoutes.get('/guests/:guestId/deletion', withPermission('delete:guest-data'), (context) =>
	previewGuestDeletion(context),
);
guestRoutes.all('/guests/:guestId/deletion', methodNotAllowed);

export default routeHandler(createRouter<AdminEnv>().route('/api/admin', guestRoutes));
