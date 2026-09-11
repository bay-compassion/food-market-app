import { randomUUID } from 'node:crypto';

import twilio from 'twilio';

type ConsentResult = {
	correlation_id?: unknown;
	error_code?: unknown;
};

/** Synchronizes website re-consent with Twilio's Messaging Service and sender-level blocks. */
export class TwilioConsentManager {
	private constructor(
		private readonly client: ReturnType<typeof twilio>,
		private readonly messagingServiceSid: string,
	) {}

	static fromEnvironment(): TwilioConsentManager | null {
		const accountSid = process.env.TWILIO_ACCOUNT_SID;
		const authToken = process.env.TWILIO_AUTH_TOKEN;
		const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

		return accountSid && authToken && messagingServiceSid
			? new TwilioConsentManager(twilio(accountSid, authToken), messagingServiceSid)
			: null;
	}

	async restoreWebsiteConsent(contactPhone: string, senderPhone: string, consentedAt: Date) {
		const items = [this.messagingServiceSid, senderPhone].map((senderId) => ({
			contact_id: contactPhone,
			correlation_id: randomUUID().replaceAll('-', ''),
			sender_id: senderId,
			status: 'opt-in',
			source: 'website',
			date_of_consent: consentedAt.toISOString(),
		}));
		const response = await this.client.accounts.v1.bulkConsents.create({ items });
		const results = response.items as unknown;

		if (!Array.isArray(results) || results.length !== items.length) {
			throw new Error('Twilio Consent API returned an incomplete response.');
		}

		const resultsByCorrelation = new Map(
			(results as ConsentResult[]).map((result) => [result.correlation_id, result]),
		);
		const failedResults = items
			.map(({ correlation_id }) => resultsByCorrelation.get(correlation_id))
			.filter((result) => !result || result.error_code !== 0);

		if (failedResults.length > 0) {
			const errorCodes = failedResults
				.map((result) => result?.error_code)
				.filter((code): code is number => typeof code === 'number');

			throw new Error(
				`Twilio Consent API rejected ${failedResults.length} item(s)` +
					(errorCodes.length > 0 ? ` with code(s) ${errorCodes.join(', ')}` : '.'),
			);
		}
	}
}
