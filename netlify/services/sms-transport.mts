import twilio from 'twilio';

export type SmsMessage = {
	to: string;
	body: string;
};

export interface SmsTransport {
	send(message: SmsMessage): Promise<{ providerMessageId: string }>;
}

/** Provider boundary shared by queued delivery and the isolated live smoke test. */
export class TwilioSmsTransport implements SmsTransport {
	private constructor(
		private readonly client: ReturnType<typeof twilio>,
		private readonly messagingServiceSid: string,
	) {}

	static configured() {
		return this.environmentSettings() !== null;
	}

	static fromEnvironment(): TwilioSmsTransport | null {
		const settings = this.environmentSettings();

		return settings
			? new TwilioSmsTransport(
					twilio(settings.accountSid, settings.authToken),
					settings.messagingServiceSid,
				)
			: null;
	}

	async send(message: SmsMessage) {
		const result = await this.client.messages.create({
			messagingServiceSid: this.messagingServiceSid,
			to: message.to,
			body: message.body,
		});

		return { providerMessageId: result.sid };
	}

	private static environmentSettings() {
		const accountSid = process.env.TWILIO_ACCOUNT_SID;
		const authToken = process.env.TWILIO_AUTH_TOKEN;
		const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

		return accountSid && authToken && messagingServiceSid
			? { accountSid, authToken, messagingServiceSid }
			: null;
	}
}
