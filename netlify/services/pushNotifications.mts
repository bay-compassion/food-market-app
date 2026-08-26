import { and, asc, eq, inArray } from 'drizzle-orm';
import webPush from 'web-push';

import { db } from '../../db/index.mjs';
import { guests, notificationDeliveries, pushSubscriptions, visits } from '../../db/schema.mjs';
import { translations, type Locale } from '../../src/locales.js';

export const notificationTypes = [
	'registration_confirmed',
	'registration_closed',
	'lottery_selected',
	'lottery_not_selected',
	'called',
] as const;

export type NotificationType = (typeof notificationTypes)[number];
export type DeliveryType = NotificationType | 'broadcast';

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

export function notificationCopy(locale: Locale, type: NotificationType) {
	const copy = translations[locale];
	const messages = {
		registration_confirmed: {
			title: copy.notificationRegisteredTitle,
			body: copy.notificationRegisteredBody,
		},
		registration_closed: {
			title: copy.notificationRegistrationClosedTitle,
			body: copy.notificationRegistrationClosedBody,
		},
		lottery_selected: {
			title: copy.notificationSelectedTitle,
			body: copy.notificationSelectedBody,
		},
		lottery_not_selected: {
			title: copy.notificationNotSelectedTitle,
			body: copy.notificationNotSelectedBody,
		},
		called: {
			title: copy.notificationCalledTitle,
			body: copy.notificationCalledBody,
		},
	} satisfies Record<NotificationType, { title: string; body: string }>;

	return messages[type];
}

export function deliveryCopy(
	locale: Locale,
	type: DeliveryType,
	custom?: { title: string | null; body: string | null },
) {
	return type === 'broadcast'
		? { title: custom?.title ?? '', body: custom?.body ?? '' }
		: notificationCopy(locale, type);
}

export async function deliverPendingNotifications(options?: {
	visitIds?: string[];
	types?: DeliveryType[];
	dedupeKeys?: string[];
	limit?: number;
}) {
	const configuration = settings();

	if (!configuration) {
		return { sent: 0, failed: 0, skipped: 0 };
	}
	webPush.setVapidDetails(configuration.subject, configuration.publicKey, configuration.privateKey);

	const conditions = [
		eq(notificationDeliveries.status, 'pending'),
		eq(notificationDeliveries.channel, 'push'),
	];

	if (options?.visitIds?.length) {
		conditions.push(inArray(notificationDeliveries.visitId, options.visitIds));
	}

	if (options?.types?.length) {
		conditions.push(inArray(notificationDeliveries.type, options.types));
	}

	if (options?.dedupeKeys?.length) {
		conditions.push(inArray(notificationDeliveries.dedupeKey, options.dedupeKeys));
	}
	const rows = await db
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
		.limit(options?.limit ?? 250);

	let sent = 0;
	let failed = 0;
	let skipped = 0;

	for (const row of rows) {
		if (!row.endpoint || !row.p256dh || !row.auth) {
			await db
				.update(notificationDeliveries)
				.set({ status: 'skipped', lastError: 'No active push subscription.' })
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
				.set({ status: 'failed', lastError: 'Notification content is missing.' })
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
				.set({ status: 'sent', attempts: row.attempts + 1, sentAt: new Date(), lastError: null })
				.where(eq(notificationDeliveries.id, row.id));
			sent += 1;
		} catch (cause: unknown) {
			const statusCode =
				typeof cause === 'object' && cause && 'statusCode' in cause
					? Number(cause.statusCode)
					: null;

			if (statusCode === 404 || statusCode === 410) {
				await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, row.endpoint));
			}
			const attempts = row.attempts + 1;

			await db
				.update(notificationDeliveries)
				.set({
					status: attempts >= 3 || statusCode === 404 || statusCode === 410 ? 'failed' : 'pending',
					attempts,
					lastError:
						cause instanceof Error ? cause.message.slice(0, 1000) : 'Push delivery failed.',
				})
				.where(eq(notificationDeliveries.id, row.id));
			failed += 1;
		}
	}

	return { sent, failed, skipped };
}
