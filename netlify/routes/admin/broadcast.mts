import { and, desc, eq, ne, or, isNotNull } from 'drizzle-orm';

import { db } from '../../../db/index.mjs';
import { marketEvents, pushSubscriptions, smsSubscriptions, visits } from '../../../db/schema.mjs';
import { withPermission } from '../../lib/http-auth.mjs';
import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
import { deliverQueuedNotifications, queueNotification } from '../../services/notifications.mjs';
import { pushConfiguration } from '../../services/pushNotifications.mjs';
import { smsConfiguration } from '../../services/smsNotifications.mjs';

function parseBroadcast(value: unknown) {
	if (!value || typeof value !== 'object') {
		return null;
	}
	const body = value as Record<string, unknown>;
	const title = typeof body.title === 'string' ? body.title.trim() : '';
	const message = typeof body.body === 'string' ? body.body.trim() : '';

	if (!title || title.length > 100 || !message || message.length > 500) {
		return null;
	}

	return { title, body: message };
}

export const broadcastRoutes = createRouter();

broadcastRoutes.post('/broadcast', withPermission('manage:sessions'), async (context) => {
	if (!pushConfiguration().configured && !smsConfiguration().configured) {
		return jsonError('Notifications are not configured.', 503);
	}

	const value = await jsonBody(context.req.raw);
	const broadcast = parseBroadcast(value);

	if (!broadcast) {
		return jsonError('Please provide a title and message.');
	}

	const [event] = await db
		.select({ id: marketEvents.id, status: marketEvents.status })
		.from(marketEvents)
		.where(ne(marketEvents.status, 'ended'))
		.orderBy(desc(marketEvents.createdAt))
		.limit(1);

	if (
		!event ||
		!['registration_open', 'registration_closed', 'lottery_pending', 'service_started'].includes(
			event.status,
		)
	) {
		return jsonError('Broadcasts require an active session.', 409);
	}

	const recipients = await db
		.select({ visitId: visits.id })
		.from(visits)
		.leftJoin(pushSubscriptions, eq(pushSubscriptions.visitId, visits.id))
		.leftJoin(smsSubscriptions, eq(smsSubscriptions.guestId, visits.guestId))
		.where(
			and(
				eq(visits.marketEventId, event.id),
				ne(visits.status, 'cancelled'),
				or(isNotNull(pushSubscriptions.id), isNotNull(smsSubscriptions.id)),
			),
		);

	if (!recipients.length) {
		return Response.json({ queued: 0, sent: 0 });
	}

	const dedupeKey = `broadcast:${crypto.randomUUID()}`;

	await queueNotification(
		db,
		recipients.map(({ visitId }) => visitId),
		'broadcast',
		dedupeKey,
		broadcast,
	);
	const result = await deliverQueuedNotifications({
		types: ['broadcast'],
		dedupeKeys: [dedupeKey],
		limit: Math.min(recipients.length, 250),
	});

	return Response.json({ queued: recipients.length, sent: result.sent });
});
broadcastRoutes.all('/broadcast', methodNotAllowed);

export default routeHandler(createRouter().route('/api/admin', broadcastRoutes));
