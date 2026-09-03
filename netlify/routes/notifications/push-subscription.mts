import { and, eq, ne } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';

import { db } from '../../../db/index.mjs';
import { pushSubscriptions } from '../../../db/schema.mjs';
import type { VisitStatus } from '../../../src/services/visitStateMachine.js';
import { type VisitAccessEnv, withVisit } from '../../lib/http-auth.mjs';
import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
import { requeueNotification } from '../../services/notifications.mjs';
import {
	deliverPendingNotifications,
	pushConfiguration,
	type NotificationType,
} from '../../services/pushNotifications.mjs';

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

const withPushConfigured = createMiddleware(async (_context, next) => {
	if (!pushConfiguration().configured) {
		return jsonError('Push notifications are not configured.', 503);
	}

	await next();
});

export const pushSubscriptionRoutes = createRouter<VisitAccessEnv>();

pushSubscriptionRoutes.get('/api/push-subscription', () => Response.json(pushConfiguration()));
pushSubscriptionRoutes.delete(
	'/api/push-subscription',
	withPushConfigured,
	withVisit,
	async (context) => {
		await db
			.delete(pushSubscriptions)
			.where(eq(pushSubscriptions.visitId, context.get('visit').id));

		return new Response(null, { status: 204 });
	},
);
pushSubscriptionRoutes.post(
	'/api/push-subscription',
	withPushConfigured,
	withVisit,
	async (context) => {
		const visit = context.get('visit');
		const body = await jsonBody(context.req.raw);

		const subscription = parseSubscription(body);

		if (!subscription) {
			return jsonError('Please provide a valid push subscription.');
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
		// Statuses with no entry here are terminal (served, no_show, cancelled) — subscribing at that
		// point should not replay a notification about a visit that is already over.
		const catchUpNotifications: Partial<Record<VisitStatus, NotificationType>> = {
			registered: 'registration_confirmed',
			waiting: 'lottery_selected',
			not_placed: 'lottery_not_selected',
			called: 'called',
		};
		const currentNotification =
			existingSubscription?.visitId === visit.id ? undefined : catchUpNotifications[visit.status];

		if (currentNotification) {
			await requeueNotification(db, [visit.id], currentNotification, currentNotification, ['push']);
			await deliverPendingNotifications({
				visitIds: [visit.id],
				types: [currentNotification],
				limit: 1,
			});
		}

		return Response.json({ subscribed: true });
	},
);
pushSubscriptionRoutes.all(
	'/api/push-subscription',
	withPushConfigured,
	withVisit,
	methodNotAllowed,
);

export default routeHandler(pushSubscriptionRoutes);
