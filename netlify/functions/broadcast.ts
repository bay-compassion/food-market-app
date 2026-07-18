import { and, desc, eq, ne } from 'drizzle-orm';

import { db } from '../../db/index.js';
import {
	marketEvents,
	notificationDeliveries,
	pushSubscriptions,
	visits,
} from '../../db/schema.js';
import { requireAuth0 } from '../lib/auth.js';
import { deliverPendingNotifications, pushConfiguration } from '../services/pushNotifications.js';

function error(message: string, status = 400) {
	return Response.json({ error: message }, { status });
}

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

export default async (request: Request) => {
	if (request.method !== 'POST') {
		return error('Method not allowed', 405);
	}
	const unauthorized = await requireAuth0(request);
	if (unauthorized) {
		return unauthorized;
	}
	if (!pushConfiguration().configured) {
		return error('Push notifications are not configured.', 503);
	}

	let value: unknown;
	try {
		value = await request.json();
	} catch {
		return error('Request body must be valid JSON.');
	}
	const broadcast = parseBroadcast(value);
	if (!broadcast) {
		return error('Please provide a title and message.');
	}

	const [event] = await db
		.select({ id: marketEvents.id, status: marketEvents.status })
		.from(marketEvents)
		.where(ne(marketEvents.status, 'ended'))
		.orderBy(desc(marketEvents.createdAt))
		.limit(1);
	if (
		!event ||
		!['registration_open', 'registration_closed', 'service_started'].includes(event.status)
	) {
		return error('Broadcasts require an active session.', 409);
	}

	const recipients = await db
		.select({ visitId: visits.id })
		.from(visits)
		.innerJoin(pushSubscriptions, eq(pushSubscriptions.visitId, visits.id))
		.where(and(eq(visits.marketEventId, event.id), ne(visits.status, 'cancelled')));
	if (!recipients.length) {
		return Response.json({ queued: 0, sent: 0 });
	}

	const dedupeKey = `broadcast:${crypto.randomUUID()}`;
	await db.insert(notificationDeliveries).values(
		recipients.map(({ visitId }) => ({
			visitId,
			type: 'broadcast',
			dedupeKey,
			title: broadcast.title,
			body: broadcast.body,
		})),
	);
	const result = await deliverPendingNotifications({
		types: ['broadcast'],
		dedupeKeys: [dedupeKey],
		limit: Math.min(recipients.length, 250),
	});

	return Response.json({ queued: recipients.length, sent: result.sent });
};

export const config = { path: '/api/broadcast' };
