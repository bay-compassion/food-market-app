import { and, asc, eq, inArray, isNull, lt, or } from 'drizzle-orm';
import webPush from 'web-push';

import { db } from '../../db/index.mjs';
import { guests, notificationDeliveries, pushSubscriptions, visits } from '../../db/schema.mjs';
import { translations, type Locale } from '../../src/locales.js';
import { deliveryCopy, type DeliveryType } from '../../src/services/notification-copy.js';
import { getLogger } from '../lib/logging.mjs';
import { tracedQuery } from '../lib/sentry.mjs';
import type {
	NotificationDeliveryOptions,
	NotificationDeliveryResult,
} from './notificationDelivery.mjs';

// The wording of a notification is shared with the stills capture, which prints it without the
// database this module reaches, so it lives with the other code both sides can import.
export {
	deliveryCopy,
	notificationCopy,
	notificationTypes,
	type DeliveryType,
	type NotificationType,
} from '../../src/services/notification-copy.js';

export function notificationsEnabled() {
	return process.env.NOTIFICATIONS_ENABLED?.trim().toLowerCase() !== 'false';
}

function settings() {
	if (!notificationsEnabled()) {
		return null;
	}
	const publicKey = process.env.VAPID_PUBLIC_KEY;
	const privateKey = process.env.VAPID_PRIVATE_KEY;
	const subject = process.env.VAPID_SUBJECT;

	return publicKey && privateKey && subject ? { publicKey, privateKey, subject } : null;
}

export function pushConfiguration() {
	const configuration = settings();

	return { configured: Boolean(configuration), publicKey: configuration?.publicKey ?? null };
}

export async function deliverPendingNotifications(
	options?: NotificationDeliveryOptions,
): Promise<NotificationDeliveryResult> {
	const configuration = settings();

	if (!configuration) {
		return { sent: 0, failed: 0, skipped: 0, processed: 0 };
	}
	webPush.setVapidDetails(configuration.subject, configuration.publicKey, configuration.privateKey);

	const conditions = [
		eq(notificationDeliveries.status, 'pending'),
		eq(notificationDeliveries.channel, 'push'),
		or(
			isNull(notificationDeliveries.claimedAt),
			eq(notificationDeliveries.claimedBy, options?.claimId ?? ''),
			lt(notificationDeliveries.claimedAt, new Date(Date.now() - 5 * 60_000)),
		)!,
	];

	if (options?.visitIds?.length) {
		conditions.push(inArray(notificationDeliveries.visitId, options.visitIds));
	}

	if (options?.marketEventId) {
		conditions.push(eq(visits.marketEventId, options.marketEventId));
	}

	if (options?.types?.length) {
		conditions.push(inArray(notificationDeliveries.type, options.types));
	}

	if (options?.dedupeKeys?.length) {
		conditions.push(inArray(notificationDeliveries.dedupeKey, options.dedupeKeys));
	}
	const rows = await tracedQuery('notification.claim_push_batch', () =>
		db.transaction(async (tx) => {
			const claimed = await tx
				.select({
					id: notificationDeliveries.id,
					attempts: notificationDeliveries.attempts,
					type: notificationDeliveries.type,
					dedupeKey: notificationDeliveries.dedupeKey,
					title: notificationDeliveries.title,
					body: notificationDeliveries.body,
					locale: guests.locale,
					endpoint: pushSubscriptions.endpoint,
					p256dh: pushSubscriptions.p256dh,
					auth: pushSubscriptions.auth,
				})
				.from(notificationDeliveries)
				.innerJoin(visits, eq(visits.id, notificationDeliveries.visitId))
				.innerJoin(guests, eq(guests.id, visits.guestId))
				.leftJoin(pushSubscriptions, eq(pushSubscriptions.visitId, visits.id))
				.where(and(...conditions))
				.orderBy(asc(notificationDeliveries.createdAt))
				.limit(options?.limit ?? 250)
				.for('update', { of: notificationDeliveries, skipLocked: true });

			if (claimed.length) {
				await tx
					.update(notificationDeliveries)
					.set({ claimedAt: new Date(), claimedBy: options?.claimId ?? null })
					.where(
						inArray(
							notificationDeliveries.id,
							claimed.map(({ id }) => id),
						),
					);
			}

			return claimed;
		}),
	);

	// The per-row status writes in the loop below are deliberately not spanned: one span per
	// recipient would spend the free span allowance on a batch's worth of near-identical rows
	// without saying anything the batch span does not.
	let sent = 0;
	let failed = 0;
	let skipped = 0;

	for (const row of rows) {
		if (!row.endpoint || !row.p256dh || !row.auth) {
			await db
				.update(notificationDeliveries)
				.set({
					status: 'skipped',
					claimedAt: null,
					claimedBy: null,
					lastError: 'No active push subscription.',
				})
				.where(eq(notificationDeliveries.id, row.id));
			skipped += 1;
			continue;
		}

		const locale = Object.hasOwn(translations, row.locale) ? (row.locale as Locale) : 'en';
		const type = row.type as DeliveryType;
		const copy = deliveryCopy(locale, type, { title: row.title, body: row.body });

		if (!copy.title || !copy.body) {
			await db
				.update(notificationDeliveries)
				.set({
					status: 'failed',
					claimedAt: null,
					claimedBy: null,
					lastError: 'Notification content is missing.',
				})
				.where(eq(notificationDeliveries.id, row.id));
			failed += 1;
			continue;
		}

		try {
			await webPush.sendNotification(
				{ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
				JSON.stringify({ ...copy, type, tag: row.dedupeKey, url: '/' }),
				{
					TTL: type === 'called' ? 15 * 60 : 6 * 60 * 60,
					urgency: type === 'called' ? 'high' : 'normal',
				},
			);
			await db
				.update(notificationDeliveries)
				.set({
					status: 'sent',
					attempts: row.attempts + 1,
					claimedAt: null,
					claimedBy: null,
					sentAt: new Date(),
					lastError: null,
				})
				.where(eq(notificationDeliveries.id, row.id));
			sent += 1;
		} catch (cause: unknown) {
			const statusCode =
				typeof cause === 'object' && cause && 'statusCode' in cause
					? Number(cause.statusCode)
					: null;

			getLogger().warn({
				message: 'notification.delivery_failed',
				channel: 'push',
				deliveryId: row.id,
				attempt: row.attempts + 1,
				providerStatus: statusCode,
				err: cause,
			});

			if (statusCode === 404 || statusCode === 410) {
				await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, row.endpoint));
			}
			const attempts = row.attempts + 1;

			await db
				.update(notificationDeliveries)
				.set({
					status: attempts >= 3 || statusCode === 404 || statusCode === 410 ? 'failed' : 'pending',
					attempts,
					claimedAt: null,
					claimedBy: null,
					lastError:
						cause instanceof Error ? cause.message.slice(0, 1000) : 'Push delivery failed.',
				})
				.where(eq(notificationDeliveries.id, row.id));
			failed += 1;
		}
	}

	return { sent, failed, skipped, processed: rows.length };
}
