import { and, eq, ne } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { notificationDeliveries, pushSubscriptions, visits } from '../../db/schema.js';
import { hashVisitToken } from '../services/guestCredentials.js';
import {
	deliverPendingNotifications,
	pushConfiguration,
	type NotificationType,
} from '../services/pushNotifications.js';

function error(message: string, status = 400) {
	return Response.json({ error: message }, { status });
}

async function authorizedVisit(request: Request) {
	const authorization = request.headers.get('authorization');
	const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
	if (!token || token.length < 32 || token.length > 200) {
		return null;
	}
	const [visit] = await db
		.select({ id: visits.id, status: visits.status })
		.from(visits)
		.where(eq(visits.accessTokenHash, hashVisitToken(token)))
		.limit(1);

	return visit ?? null;
}

function parseSubscription(value: unknown) {
	if (!value || typeof value !== 'object') {
		return null;
	}
	const body = value as Record<string, unknown>;
	const keys = body.keys;
	if (!keys || typeof keys !== 'object') {
		return null;
	}
	const endpoint = typeof body.endpoint === 'string' ? body.endpoint : '';
	const p256dh =
		typeof (keys as Record<string, unknown>).p256dh === 'string'
			? String((keys as Record<string, unknown>).p256dh)
			: '';
	const auth =
		typeof (keys as Record<string, unknown>).auth === 'string'
			? String((keys as Record<string, unknown>).auth)
			: '';
	if (!endpoint.startsWith('https://') || endpoint.length > 2000 || !p256dh || !auth) {
		return null;
	}

	return { endpoint, p256dh, auth };
}

export default async (request: Request) => {
	if (request.method === 'GET') {
		return Response.json(pushConfiguration());
	}
	if (!pushConfiguration().configured) {
		return error('Push notifications are not configured.', 503);
	}
	const visit = await authorizedVisit(request);
	if (!visit) {
		return error('Visit access could not be verified.', 401);
	}
	if (request.method === 'DELETE') {
		await db.delete(pushSubscriptions).where(eq(pushSubscriptions.visitId, visit.id));

		return new Response(null, { status: 204 });
	}
	if (request.method !== 'POST') {
		return error('Method not allowed', 405);
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return error('Request body must be valid JSON.');
	}
	const subscription = parseSubscription(body);
	if (!subscription) {
		return error('Please provide a valid push subscription.');
	}
	const [existingSubscription] = await db
		.select({ visitId: pushSubscriptions.visitId })
		.from(pushSubscriptions)
		.where(eq(pushSubscriptions.endpoint, subscription.endpoint))
		.limit(1);

	await db.transaction(async (tx) => {
		await tx
			.delete(pushSubscriptions)
			.where(
				and(
					eq(pushSubscriptions.visitId, visit.id),
					ne(pushSubscriptions.endpoint, subscription.endpoint),
				),
			);
		await tx
			.insert(pushSubscriptions)
			.values({ visitId: visit.id, ...subscription })
			.onConflictDoUpdate({
				target: pushSubscriptions.endpoint,
				set: {
					visitId: visit.id,
					p256dh: subscription.p256dh,
					auth: subscription.auth,
					updatedAt: new Date(),
				},
			});
	});
	const currentNotification =
		existingSubscription?.visitId === visit.id
			? undefined
			: ({
					registered: 'registration_confirmed',
					waiting: 'lottery_selected',
					not_placed: 'lottery_not_selected',
					called: 'called',
				}[visit.status] as NotificationType | undefined);
	if (currentNotification) {
		await db
			.insert(notificationDeliveries)
			.values({ visitId: visit.id, type: currentNotification, dedupeKey: currentNotification })
			.onConflictDoUpdate({
				target: [notificationDeliveries.visitId, notificationDeliveries.dedupeKey],
				set: { status: 'pending', attempts: 0, lastError: null, sentAt: null },
			});
		await deliverPendingNotifications({
			visitIds: [visit.id],
			types: [currentNotification],
			limit: 1,
		});
	}

	return Response.json({ subscribed: true });
};

export const config = { path: '/api/push-subscription' };
