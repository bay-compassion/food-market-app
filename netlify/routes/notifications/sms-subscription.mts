import { eq } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import { z } from 'zod';

import { db } from '../../../db/index.mjs';
import { smsOptOuts, smsSubscriptions } from '../../../db/schema.mjs';
import type { VisitStatus } from '../../../src/services/visitStateMachine.js';
import { type DeviceGuestEnv, withDeviceGuest } from '../../lib/http-auth.mjs';
import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
import { getLogger } from '../../lib/logging.mjs';
import { currentMarketVisitForGuest } from '../../services/current-visit.mjs';
import { requeueNotification } from '../../services/notifications.mjs';
import type { NotificationType } from '../../services/pushNotifications.mjs';
import {
	deliverPendingSmsNotifications,
	smsConfiguration,
} from '../../services/smsNotifications.mjs';
import { TwilioConsentManager } from '../../services/twilio-consent.mjs';

/** Texting a guest is opt-in, so nothing but an explicit yes counts as consent. */
const consentSchema = z.object({ consent: z.literal(true) });

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
		const consent = consentSchema.safeParse(await jsonBody(context.req.raw));

		if (!consent.success) {
			return jsonError('Please confirm you consent to receive text messages.');
		}

		const [existingSubscription] = await db
			.select({ guestId: smsSubscriptions.guestId })
			.from(smsSubscriptions)
			.where(eq(smsSubscriptions.guestId, guest.id))
			.limit(1);
		const [optOut] = await db
			.select({ senderPhone: smsOptOuts.senderPhone })
			.from(smsOptOuts)
			.where(eq(smsOptOuts.guestId, guest.id))
			.limit(1);
		const consentedAt = new Date();

		if (optOut) {
			const consentManager = TwilioConsentManager.fromEnvironment();

			if (!consentManager) {
				return jsonError('SMS notifications are not configured.', 503);
			}

			try {
				await consentManager.restoreWebsiteConsent(
					guest.normalizedPhone,
					optOut.senderPhone,
					consentedAt,
				);
			} catch {
				getLogger().warn({
					message: 'sms.consent_restore_failed',
				});

				return jsonError('Unable to restore SMS consent. Please try again.', 502);
			}
		}

		await db.transaction(async (tx) => {
			if (optOut) {
				await tx.delete(smsOptOuts).where(eq(smsOptOuts.guestId, guest.id));
			}
			await tx
				.insert(smsSubscriptions)
				.values({ guestId: guest.id, consentedAt })
				.onConflictDoUpdate({
					target: smsSubscriptions.guestId,
					set: { consentedAt },
				});
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
