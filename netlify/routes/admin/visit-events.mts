import { z } from 'zod';

import { type AdminEnv, withPermission } from '../../lib/http-auth.mjs';
import { createRouter, jsonError, methodNotAllowed, routeHandler } from '../../lib/http.mjs';
import { listVisitEvents } from '../../services/visit-events.mjs';

const visitIdSchema = z.uuid();

export const visitEventRoutes = createRouter<AdminEnv>();

/**
 * One visit's history, oldest first — what the volunteer screen's History panel lists. Gated on
 * `run:queue` like the queue itself: entries name workers, so the room display never reads them.
 */
visitEventRoutes.get('/visits/:id/events', withPermission('run:queue'), async (context) => {
	const visitId = visitIdSchema.safeParse(context.req.param('id'));

	if (!visitId.success) {
		return jsonError('Please name a visit.');
	}

	return Response.json({ events: await listVisitEvents(visitId.data) });
});
visitEventRoutes.all('/visits/:id/events', methodNotAllowed);

export default routeHandler(createRouter<AdminEnv>().route('/api/admin', visitEventRoutes));
