import { z } from 'zod';

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

const callNextSchema = z.object({
	action: z.literal('call_next'),
	// A worker who does not say how many wants the next guest.
	count: z.preprocess((count) => count ?? 1, z.coerce.number().int().min(1).max(maximumBatchSize)),
});

export const queueRoutes = createRouter();

queueRoutes.post('/queue', withPermission('run:queue'), async (context) => {
	const request = callNextSchema.safeParse(await jsonBody(context.req.raw));

	if (!request.success) {
		return jsonError(
			request.error.issues.every((issue) => issue.path[0] === 'count')
				? `Please call between 1 and ${maximumBatchSize} guests at a time.`
				: 'Invalid queue action.',
		);
	}

	const event = await getCurrentEvent();

	if (!event) {
		return jsonError('No market event has been configured.', 409);
	}

	if (event.status !== 'service_started') {
		return jsonError('Guests can only be called after service starts.', 409);
	}

	return Response.json({ called: await callNextVisits(event.id, request.data.count) });
});
queueRoutes.all('/queue', methodNotAllowed);

export default routeHandler(createRouter().route('/api/admin', queueRoutes));
