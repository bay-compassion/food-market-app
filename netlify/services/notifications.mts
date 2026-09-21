import { db } from '../../db/index.mjs';
import { notificationDeliveries } from '../../db/schema.mjs';
import { isSmsNotificationType } from '../../src/services/notification-copy.js';
import { getLogger } from '../lib/logging.mjs';
import type { NotificationDeliveryOptions } from './notificationDelivery.mjs';
import { deliverPendingNotifications, type DeliveryType } from './pushNotifications.mjs';
import { deliverPendingSmsNotifications } from './smsNotifications.mjs';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type QueryClient = typeof db | Transaction;

/** Every transport a notification can be queued for. */
export const notificationChannels = ['push', 'sms'] as const;
export type NotificationChannel = (typeof notificationChannels)[number];

function rows(
	visitIds: string[],
	type: DeliveryType,
	dedupeKey: string,
	channels: readonly NotificationChannel[],
	custom?: { title: string; body: string },
) {
	// A type with no text message never queues an SMS row, whichever caller asks for one.
	const deliverable = channels.filter(
		(channel) => channel !== 'sms' || isSmsNotificationType(type),
	);

	return visitIds.flatMap((visitId) =>
		deliverable.map((channel) => ({
			visitId,
			type,
			dedupeKey,
			channel,
			title: custom?.title ?? null,
			body: custom?.body ?? null,
		})),
	);
}

/**
 * Queues a notification for every channel, leaving an already-queued `(visit, dedupeKey, channel)`
 * row untouched — for events that should only ever notify once (e.g. registration closing).
 */
export async function queueNotification(
	client: QueryClient,
	visitIds: string[],
	type: DeliveryType,
	dedupeKey: string,
	custom?: { title: string; body: string },
) {
	if (!visitIds.length) {
		return;
	}
	await client
		.insert(notificationDeliveries)
		.values(rows(visitIds, type, dedupeKey, notificationChannels, custom))
		.onConflictDoNothing();
}

/**
 * Same as {@link queueNotification}, but resets a matching row that already exists back to
 * `pending` instead of leaving it alone — for events that should re-notify on repeat (re-calling a
 * guest, re-subscribing a channel). `channels` lets a single-channel subscribe flow queue just its
 * own channel instead of both.
 */
export async function requeueNotification(
	client: QueryClient,
	visitIds: string[],
	type: DeliveryType,
	dedupeKey: string,
	channels: readonly NotificationChannel[] = notificationChannels,
) {
	if (!visitIds.length) {
		return;
	}
	await client
		.insert(notificationDeliveries)
		.values(rows(visitIds, type, dedupeKey, channels))
		.onConflictDoUpdate({
			target: [
				notificationDeliveries.visitId,
				notificationDeliveries.dedupeKey,
				notificationDeliveries.channel,
			],
			set: {
				status: 'pending',
				attempts: 0,
				claimedAt: null,
				claimedBy: null,
				lastError: null,
				sentAt: null,
			},
		});
}

/** Delivers every pending notification across every channel, summing each channel's outcome. */
export async function deliverQueuedNotifications(options?: NotificationDeliveryOptions) {
	const deliveryOptions = { ...options, claimId: options?.claimId ?? crypto.randomUUID() };
	const [push, sms] = await Promise.all([
		deliverPendingNotifications(deliveryOptions),
		deliverPendingSmsNotifications(deliveryOptions),
	]);

	const pushProcessed = push.processed ?? push.sent + push.failed + push.skipped;
	const smsProcessed = sms.processed ?? sms.sent + sms.failed + sms.skipped;

	for (const [channel, result] of [
		['push', push],
		['sms', sms],
	] as const) {
		if (result.sent + result.failed + result.skipped > 0) {
			getLogger()[result.failed > 0 ? 'warn' : 'info']({
				message: 'notifications.delivered',
				channel,
				...result,
			});
		}
	}

	return {
		sent: push.sent + sms.sent,
		failed: push.failed + sms.failed,
		skipped: push.skipped + sms.skipped,
		processed: pushProcessed + smsProcessed,
		hasMore:
			pushProcessed === (deliveryOptions.limit ?? 250) ||
			smsProcessed === (deliveryOptions.limit ?? 250),
	};
}
