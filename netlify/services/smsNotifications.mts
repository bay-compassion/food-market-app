import { and, asc, eq, inArray } from 'drizzle-orm';
import twilio from 'twilio';

import { db } from '../../db/index.mjs';
import { guests, notificationDeliveries, smsSubscriptions, visits } from '../../db/schema.mjs';
import { translations, type Locale } from '../../src/locales.js';
import { deliveryCopy, notificationsEnabled, type DeliveryType } from './pushNotifications.mjs';

/**
 * Twilio error codes that mean this number can never receive another message from us: an invalid
 * number, a recipient who has texted STOP, or a landline/VoIP number that isn't SMS-capable.
 * https://www.twilio.com/docs/api/errors
 */
const permanentFailureCodes = new Set([21211, 21610, 21614]);

function settings() {
	if (!notificationsEnabled()) {
		return null;
	}
	const accountSid = process.env.TWILIO_ACCOUNT_SID;
	const authToken = process.env.TWILIO_AUTH_TOKEN;
	const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

	return accountSid && authToken && messagingServiceSid
		? { accountSid, authToken, messagingServiceSid }
		: null;
}

export function smsConfiguration() {
	return { configured: Boolean(settings()) };
}

export async function deliverPendingSmsNotifications(options?: {
	visitIds?: string[];
	types?: DeliveryType[];
	dedupeKeys?: string[];
	limit?: number;
}) {
	const configuration = settings();
	if (!configuration) {
		return { sent: 0, failed: 0, skipped: 0 };
	}
	const client = twilio(configuration.accountSid, configuration.authToken);

	const conditions = [
		eq(notificationDeliveries.status, 'pending'),
		eq(notificationDeliveries.channel, 'sms'),
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
			visitId: notificationDeliveries.visitId,
			attempts: notificationDeliveries.attempts,
			type: notificationDeliveries.type,
			title: notificationDeliveries.title,
			body: notificationDeliveries.body,
			locale: guests.locale,
			phone: guests.normalizedPhone,
			subscribed: smsSubscriptions.id,
		})
		.from(notificationDeliveries)
		.innerJoin(visits, eq(visits.id, notificationDeliveries.visitId))
		.innerJoin(guests, eq(guests.id, visits.guestId))
		.leftJoin(smsSubscriptions, eq(smsSubscriptions.visitId, visits.id))
		.where(and(...conditions))
		.orderBy(asc(notificationDeliveries.createdAt))
		.limit(options?.limit ?? 250);

	let sent = 0;
	let failed = 0;
	let skipped = 0;
	for (const row of rows) {
		if (!row.subscribed || !row.phone) {
			await db
				.update(notificationDeliveries)
				.set({ status: 'skipped', lastError: 'No active SMS subscription.' })
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
			await client.messages.create({
				messagingServiceSid: configuration.messagingServiceSid,
				to: row.phone,
				body: `${copy.title}\n\n${copy.body}`,
			});
			await db
				.update(notificationDeliveries)
				.set({ status: 'sent', attempts: row.attempts + 1, sentAt: new Date(), lastError: null })
				.where(eq(notificationDeliveries.id, row.id));
			sent += 1;
		} catch (cause: unknown) {
			const code =
				typeof cause === 'object' && cause && 'code' in cause ? Number(cause.code) : null;
			if (code !== null && permanentFailureCodes.has(code)) {
				await db.delete(smsSubscriptions).where(eq(smsSubscriptions.visitId, row.visitId));
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
					lastError: cause instanceof Error ? cause.message.slice(0, 1000) : 'SMS delivery failed.',
				})
				.where(eq(notificationDeliveries.id, row.id));
			failed += 1;
		}
	}

	return { sent, failed, skipped };
}
