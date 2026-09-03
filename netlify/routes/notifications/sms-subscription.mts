import { and, desc, eq, ne } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';

import { db } from '../../../db/index.mjs';
import { marketEvents, smsSubscriptions, visits } from '../../../db/schema.mjs';
import type { VisitStatus } from '../../../src/services/visitStateMachine.js';
import { type DeviceGuestEnv, withDeviceGuest } from '../../lib/http-auth.mjs';
import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
import { requeueNotification } from '../../services/notifications.mjs';
import type { NotificationType } from '../../services/pushNotifications.mjs';
import {
	deliverPendingSmsNotifications,
	smsConfiguration,
} from '../../services/smsNotifications.mjs';

async function currentMarketVisitForGuest(guestId: string) {
	const [event] = await db
		.select({ id: marketEvents.id })
		.from(marketEvents)
		.where(ne(marketEvents.status, 'ended'))
		.orderBy(desc(marketEvents.createdAt))
		.limit(1);

	if (!event) {
		return null;
	}

	const [visit] = await db
		.select({ id: visits.id, status: visits.status })
		.from(visits)
		.where(and(eq(visits.guestId, guestId), eq(visits.marketEventId, event.id)))
		.orderBy(desc(visits.createdAt))
		.limit(1);

	return visit ?? null;
}

const withSmsConfigured = createMiddleware(async (_context, next) => {
	if (!smsConfiguration().configured) {
		return jsonError('SMS notifications are not configured.', 503);
	}

	await next();
});

export const smsSubscriptionRoutes = createRouter<DeviceGuestEnv>();

smsSubscriptionRoutes.get('/api/sms-subscription', () => Response.json(smsConfiguration()));
smsSubscriptionRoutes.delete(
	'/api/sms-subscription',
	withSmsConfigured,
	withDeviceGuest,
	async (context) => {
		await db.delete(smsSubscriptions).where(eq(smsSubscriptions.guestId, context.get('guest').id));

		return new Response(null, { status: 204 });
	},
);
smsSubscriptionRoutes.post(
	'/api/sms-subscription',
	withSmsConfigured,
	withDeviceGuest,
	async (context) => {
		const guest = context.get('guest');
		const body = await jsonBody(context.req.raw);

		const consent = Boolean(
			body && typeof body === 'object' && (body as { consent?: unknown }).consent === true,
		);

		if (!consent) {
			return jsonError('Please confirm you consent to receive text messages.');
		}

		const [existingSubscription] = await db
			.select({ guestId: smsSubscriptions.guestId })
			.from(smsSubscriptions)
			.where(eq(smsSubscriptions.guestId, guest.id))
			.limit(1);

		await db
			.insert(smsSubscriptions)
			.values({ guestId: guest.id })
			.onConflictDoUpdate({
				target: smsSubscriptions.guestId,
				set: { consentedAt: new Date() },
			});

		if (existingSubscription) {
			return Response.json({ subscribed: true });
		}

		const currentVisit = await currentMarketVisitForGuest(guest.id);

		if (!currentVisit) {
			return Response.json({ subscribed: true });
		}

		// Statuses with no entry here are terminal (served, no_show, cancelled) — subscribing at that
		// point should not replay a notification about a visit that is already over.
		const catchUpNotifications: Partial<Record<VisitStatus, NotificationType>> = {
			registered: 'registration_confirmed',
			waiting: 'lottery_selected',
			not_placed: 'lottery_not_selected',
			called: 'called',
		};
		const currentNotification = catchUpNotifications[currentVisit.status];

		if (currentNotification) {
			await requeueNotification(db, [currentVisit.id], currentNotification, currentNotification, [
				'sms',
			]);
			await deliverPendingSmsNotifications({
				visitIds: [currentVisit.id],
				types: [currentNotification],
				limit: 1,
			});
		}

		return Response.json({ subscribed: true });
	},
);
smsSubscriptionRoutes.all(
	'/api/sms-subscription',
	withSmsConfigured,
	withDeviceGuest,
	methodNotAllowed,
);

export default routeHandler(smsSubscriptionRoutes);
