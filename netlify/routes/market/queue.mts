import { withPermission } from '../../lib/http-auth.mjs';
import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
import { getCurrentEvent } from '../../services/marketSession.mjs';
import { callNextVisits } from '../../services/visitQueue.mjs';

const maximumBatchSize = 50;

export const queueRoutes = createRouter();

queueRoutes.post('/api/queue', withPermission('run:queue'), async (context) => {
	const body = await jsonBody(context.req.raw);
	const { action, count } = (body ?? {}) as Record<string, unknown>;

	if (action !== 'call_next') {
		return jsonError('Invalid queue action.');
	}
	const batchSize = Number(count ?? 1);

	if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > maximumBatchSize) {
		return jsonError(`Please call between 1 and ${maximumBatchSize} guests at a time.`);
	}

	const event = await getCurrentEvent();

	if (!event) {
		return jsonError('No market event has been configured.', 409);
	}

	if (event.status !== 'service_started') {
		return jsonError('Guests can only be called after service starts.', 409);
	}

	return Response.json({ called: await callNextVisits(event.id, batchSize) });
});
queueRoutes.all('/api/queue', methodNotAllowed);

export default routeHandler(queueRoutes);
