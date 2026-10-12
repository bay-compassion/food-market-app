import { and, eq, inArray, sql } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import { z } from 'zod';

import { db } from '../../../db/index.mjs';
import { marketEvents, visits } from '../../../db/schema.mjs';
import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
import { tracedQuery } from '../../lib/sentry.mjs';
import { hashVisitToken } from '../../services/guestCredentials.mjs';
import { calledNumbers, highestCalledNumber } from '../../services/queue-board.mjs';
import { guestActor, recordVisitEvents } from '../../services/visit-events.mjs';

/** Cancelling is the only change a guest can make to their own visit. */
const visitActionSchema = z.object({ action: z.literal('cancel') });

function accessToken(request: Request) {
	const authorization = request.headers.get('authorization');

	return authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
}

async function authorizedVisit(request: Request) {
	const token = accessToken(request);

	if (!token || token.length < 32 || token.length > 200) {
		return null;
	}
	const [visit] = await tracedQuery('visit.read_for_guest', () =>
		db
			.select({
				id: visits.id,
				status: visits.status,
				marketEventId: visits.marketEventId,
				queuePosition: visits.queuePosition,
				priorityNumber: visits.priorityNumber,
				queueFront: visits.queueFront,
				queueOrder: visits.queueOrder,
				calledAt: visits.calledAt,
				sessionStatus: marketEvents.status,
			})
			.from(visits)
			.innerJoin(marketEvents, eq(marketEvents.id, visits.marketEventId))
			.where(eq(visits.accessTokenHash, hashVisitToken(token)))
			.limit(1),
	);

	return visit ?? null;
}

/**
 * How many guests are still ahead of this one in the queue. Only meaningful while waiting — a
 * called or served guest has no one ahead of them, so the guest app shows nothing instead.
 */
async function guestsAhead(visit: {
	status: string;
	marketEventId: string;
	queueFront: boolean;
	queueOrder: number | null;
}) {
	// Destructured so the null check narrows a const: a property read loses its narrowing inside
	// the query closure below.
	const { queueFront, queueOrder } = visit;

	if (visit.status !== 'waiting' || queueOrder === null) {
		return null;
	}
	const [ahead] = await tracedQuery('visit.count_ahead', () =>
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(visits)
			.where(
				and(
					eq(visits.marketEventId, visit.marketEventId),
					eq(visits.status, 'waiting'),
					// `LineOrder.compare`: everyone put at the front, then the rest in order.
					sql`((${visits.queueFront} AND NOT ${queueFront}) OR (${visits.queueFront} = ${queueFront} AND ${visits.queueOrder} < ${queueOrder}))`,
				),
			),
	);

	return ahead?.count ?? 0;
}

/**
 * The "now calling" board, like `guestsAhead` only meaningful while waiting: the highest main number
 * called, and every number at the entrance now in either series — a batch, and any `P` numbers —
 * which a guest sees beside it.
 */
async function nowCalling(visit: { status: string; marketEventId: string }) {
	if (visit.status !== 'waiting') {
		return { nowCalling: null, called: [], calledPriority: [] };
	}

	const highest = await highestCalledNumber(visit.marketEventId);

	return { nowCalling: highest, ...(await calledNumbers(visit.marketEventId)) };
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

	// The line order is the server's business: a guest sees their number, never how it was placed.
	const { queueFront: _front, queueOrder: _order, ...shown } = visit;

	return Response.json({
		...shown,
		aheadOfYou: await guestsAhead(visit),
		...(await nowCalling(visit)),
	});
});
visitRoutes.patch('/api/visit', async (context) => {
	const visit = context.get('visit');

	if (visit.sessionStatus === 'ended') {
		return jsonError('This visit can no longer be cancelled.', 409);
	}
	const action = visitActionSchema.safeParse(await jsonBody(context.req.raw));

	if (!action.success) {
		return jsonError('Invalid visit action.');
	}
	const cancelled = await tracedQuery('visit.cancel', () =>
		db.transaction(async (tx) => {
			const [row] = await tx
				.update(visits)
				.set({ status: 'cancelled' })
				.where(and(eq(visits.id, visit.id), inArray(visits.status, ['registered', 'waiting'])))
				.returning({ id: visits.id, status: visits.status });

			if (row) {
				await recordVisitEvents(tx, [
					{ visitId: row.id, kind: 'cancelled', toStatus: row.status, actor: guestActor },
				]);
			}

			return row ?? null;
		}),
	);

	return cancelled
		? Response.json(cancelled)
		: jsonError('This visit can no longer be cancelled.', 409);
});
visitRoutes.all('/api/visit', methodNotAllowed);

export default routeHandler(visitRoutes);
