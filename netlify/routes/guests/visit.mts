import { and, eq, inArray, lt, sql } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';

import { db } from '../../../db/index.mjs';
import { marketEvents, visits } from '../../../db/schema.mjs';
import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
import { hashVisitToken } from '../../services/guestCredentials.mjs';

function accessToken(request: Request) {
	const authorization = request.headers.get('authorization');

	return authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
}

async function authorizedVisit(request: Request) {
	const token = accessToken(request);

	if (!token || token.length < 32 || token.length > 200) {
		return null;
	}
	const [visit] = await db
		.select({
			id: visits.id,
			status: visits.status,
			marketEventId: visits.marketEventId,
			queuePosition: visits.queuePosition,
			calledAt: visits.calledAt,
			sessionStatus: marketEvents.status,
		})
		.from(visits)
		.innerJoin(marketEvents, eq(marketEvents.id, visits.marketEventId))
		.where(eq(visits.accessTokenHash, hashVisitToken(token)))
		.limit(1);

	return visit ?? null;
}

/**
 * How many guests are still ahead of this one in the queue. Only meaningful while waiting — a
 * called or served guest has no one ahead of them, so the guest app shows nothing instead.
 */
async function guestsAhead(visit: {
	status: string;
	marketEventId: string;
	queuePosition: number | null;
}) {
	if (visit.status !== 'waiting' || visit.queuePosition === null) {
		return null;
	}
	const [ahead] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(visits)
		.where(
			and(
				eq(visits.marketEventId, visit.marketEventId),
				eq(visits.status, 'waiting'),
				lt(visits.queuePosition, visit.queuePosition),
			),
		);

	return ahead?.count ?? 0;
}

type Visit = NonNullable<Awaited<ReturnType<typeof authorizedVisit>>>;
type VisitEnv = { Variables: { visit: Visit } };

const withCurrentVisit = createMiddleware<VisitEnv>(async (context, next) => {
	const visit = await authorizedVisit(context.req.raw);

	if (!visit) {
		return jsonError('Visit access could not be verified.', 401);
	}

	context.set('visit', visit);
	await next();
});

export const visitRoutes = createRouter<VisitEnv>();

visitRoutes.use('/api/visit', withCurrentVisit);
visitRoutes.get('/api/visit', async (context) => {
	const visit = context.get('visit');

	if (visit.sessionStatus === 'ended') {
		return jsonError('This visit belongs to an ended session.', 410);
	}

	return Response.json({ ...visit, aheadOfYou: await guestsAhead(visit) });
});
visitRoutes.patch('/api/visit', async (context) => {
	const visit = context.get('visit');

	if (visit.sessionStatus === 'ended') {
		return jsonError('This visit can no longer be cancelled.', 409);
	}
	const body = await jsonBody(context.req.raw);

	if ((body as { action?: unknown } | null)?.action !== 'cancel') {
		return jsonError('Invalid visit action.');
	}
	const [cancelled] = await db
		.update(visits)
		.set({ status: 'cancelled' })
		.where(and(eq(visits.id, visit.id), inArray(visits.status, ['registered', 'waiting'])))
		.returning({ id: visits.id, status: visits.status });

	return cancelled
		? Response.json(cancelled)
		: jsonError('This visit can no longer be cancelled.', 409);
});
visitRoutes.all('/api/visit', methodNotAllowed);

export default routeHandler(visitRoutes);
