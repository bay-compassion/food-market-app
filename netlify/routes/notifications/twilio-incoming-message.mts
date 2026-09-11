import { eq, inArray } from 'drizzle-orm';
import twilio from 'twilio';

import { db } from '../../../db/index.mjs';
import { guests, smsOptOuts, smsSubscriptions } from '../../../db/schema.mjs';
import { createRouter, jsonError, methodNotAllowed, routeHandler } from '../../lib/http.mjs';
import { getLogger } from '../../lib/logging.mjs';

const formContentType = 'application/x-www-form-urlencoded';

function emptyMessagingResponse() {
	return new Response(new twilio.twiml.MessagingResponse().toString(), {
		headers: { 'Content-Type': 'application/xml; charset=UTF-8' },
	});
}

function webhookSettings() {
	const accountSid = process.env.TWILIO_ACCOUNT_SID;
	const authToken = process.env.TWILIO_AUTH_TOKEN;
	const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

	return accountSid && authToken && messagingServiceSid
		? { accountSid, authToken, messagingServiceSid }
		: null;
}

export const twilioIncomingMessageRoutes = createRouter();

twilioIncomingMessageRoutes.post('/api/twilio/incoming-message', async (context) => {
	const settings = webhookSettings();

	if (!settings) {
		return jsonError('SMS notifications are not configured.', 503);
	}

	const contentType = context.req.header('Content-Type')?.split(';', 1)[0]?.trim().toLowerCase();

	if (contentType !== formContentType) {
		return jsonError('Request body must use application/x-www-form-urlencoded.', 415);
	}

	const parameters = Object.fromEntries(new URLSearchParams(await context.req.text()));
	const signature = context.req.header('X-Twilio-Signature') ?? '';

	if (!twilio.validateRequest(settings.authToken, signature, context.req.url, parameters)) {
		return jsonError('Webhook signature could not be verified.', 403);
	}

	if (
		parameters.AccountSid !== settings.accountSid ||
		parameters.MessagingServiceSid !== settings.messagingServiceSid
	) {
		return jsonError('Webhook source could not be verified.', 403);
	}

	const from = parameters.From;
	const to = parameters.To;
	const optOutType = parameters.OptOutType;

	if (!from || !to || (optOutType !== 'STOP' && optOutType !== 'START')) {
		return emptyMessagingResponse();
	}

	const matchingGuests = await db
		.select({ id: guests.id })
		.from(guests)
		.where(eq(guests.normalizedPhone, from));

	if (matchingGuests.length === 0) {
		getLogger().info({ message: 'sms.consent_webhook_unmatched', optOutType });

		return emptyMessagingResponse();
	}

	const guestIds = matchingGuests.map(({ id }) => id);

	if (optOutType === 'STOP') {
		const optedOutAt = new Date();

		await db.transaction(async (tx) => {
			await tx
				.insert(smsOptOuts)
				.values(guestIds.map((guestId) => ({ guestId, senderPhone: to, optedOutAt })))
				.onConflictDoUpdate({
					target: smsOptOuts.guestId,
					set: { senderPhone: to, optedOutAt },
				});
			await tx.delete(smsSubscriptions).where(inArray(smsSubscriptions.guestId, guestIds));
		});
	} else {
		const consentedAt = new Date();

		await db.transaction(async (tx) => {
			await tx.delete(smsOptOuts).where(inArray(smsOptOuts.guestId, guestIds));
			await tx
				.insert(smsSubscriptions)
				.values(guestIds.map((guestId) => ({ guestId, consentedAt })))
				.onConflictDoUpdate({
					target: smsSubscriptions.guestId,
					set: { consentedAt },
				});
		});
	}

	getLogger().info({
		message: optOutType === 'STOP' ? 'sms.consent_opted_out' : 'sms.consent_opted_in',
		guestCount: guestIds.length,
	});

	return emptyMessagingResponse();
});

twilioIncomingMessageRoutes.all('/api/twilio/incoming-message', methodNotAllowed);

export default routeHandler(twilioIncomingMessageRoutes);
