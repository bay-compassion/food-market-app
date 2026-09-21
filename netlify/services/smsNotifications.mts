import { and, asc, eq, inArray, isNull, lt, or } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { guests, notificationDeliveries, smsSubscriptions, visits } from '../../db/schema.mjs';
import { translations, type Locale } from '../../src/locales.js';
import {
	deliveryCopy,
	smsMessage,
	type DeliveryType,
} from '../../src/services/notification-copy.js';
import { getLogger } from '../lib/logging.mjs';
import { tracedQuery } from '../lib/sentry.mjs';
import type {
	NotificationDeliveryOptions,
	NotificationDeliveryResult,
} from './notificationDelivery.mjs';
import { notificationsEnabled } from './pushNotifications.mjs';
import { TwilioSmsTransport } from './sms-transport.mjs';

/**
 * Twilio error codes that mean this number can never receive another message from us: an invalid
 * number, a recipient who has texted STOP, or a landline/VoIP number that isn't SMS-capable.
 * https://www.twilio.com/docs/api/errors
 */
const permanentFailureCodes = new Set([21211, 21610, 21614]);

// Composing a message is shared with the screenshots capture, which prints it without the database and
// Twilio this module reaches.
export { smsMessage } from '../../src/services/notification-copy.js';

export function smsConfiguration() {
	return { configured: notificationsEnabled() && TwilioSmsTransport.configured() };
}

export async function deliverPendingSmsNotifications(
	options?: NotificationDeliveryOptions,
): Promise<NotificationDeliveryResult> {
	const transport = notificationsEnabled() ? TwilioSmsTransport.fromEnvironment() : null;

	if (!transport) {
		return { sent: 0, failed: 0, skipped: 0, processed: 0 };
	}

	const conditions = [
		eq(notificationDeliveries.status, 'pending'),
		eq(notificationDeliveries.channel, 'sms'),
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
	const rows = await tracedQuery('notification.claim_sms_batch', () =>
		db.transaction(async (tx) => {
			const claimed = await tx
				.select({
					id: notificationDeliveries.id,
					visitId: notificationDeliveries.visitId,
					guestId: guests.id,
					attempts: notificationDeliveries.attempts,
					type: notificationDeliveries.type,
					title: notificationDeliveries.title,
					body: notificationDeliveries.body,
					locale: guests.locale,
					phone: guests.normalizedPhone,
					queuePosition: visits.queuePosition,
					fake: guests.fake,
					subscribed: smsSubscriptions.id,
				})
				.from(notificationDeliveries)
				.innerJoin(visits, eq(visits.id, notificationDeliveries.visitId))
				.innerJoin(guests, eq(guests.id, visits.guestId))
				.leftJoin(smsSubscriptions, eq(smsSubscriptions.guestId, guests.id))
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
		if (row.fake || !row.subscribed || !row.phone) {
			await db
				.update(notificationDeliveries)
				.set({
					status: 'skipped',
					claimedAt: null,
					claimedBy: null,
					lastError: row.fake
						? 'Fake guest; SMS delivery suppressed.'
						: 'No active SMS subscription.',
				})
				.where(eq(notificationDeliveries.id, row.id));
			skipped += 1;
			continue;
		}

		const locale = Object.hasOwn(translations, row.locale) ? (row.locale as Locale) : 'en';
		const type = row.type as DeliveryType;
		const copy = deliveryCopy(locale, type, { title: row.title, body: row.body });

		if (!copy.title || !copy.body || (type === 'lottery_selected' && row.queuePosition === null)) {
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
			await transport.send({
				to: row.phone,
				body: smsMessage(locale, type, row.queuePosition, {
					title: row.title,
					body: row.body,
				}),
			});
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
			const code =
				typeof cause === 'object' && cause && 'code' in cause ? Number(cause.code) : null;

			getLogger().warn({
				message: 'notification.delivery_failed',
				channel: 'sms',
				deliveryId: row.id,
				attempt: row.attempts + 1,
				providerCode: code,
				err: cause,
			});

			if (code !== null && permanentFailureCodes.has(code)) {
				await db.delete(smsSubscriptions).where(eq(smsSubscriptions.guestId, row.guestId));
			}
			const attempts = row.attempts + 1;

			await db
				.update(notificationDeliveries)
				.set({
					status:
						attempts >= 3 || (code !== null && permanentFailureCodes.has(code))
							? 'failed'
							: 'pending',
					attempts,
					claimedAt: null,
					claimedBy: null,
					lastError: cause instanceof Error ? cause.message.slice(0, 1000) : 'SMS delivery failed.',
				})
				.where(eq(notificationDeliveries.id, row.id));
			failed += 1;
		}
	}

	return { sent, failed, skipped, processed: rows.length };
}
