/**
 * The Twilio account every outbound message and consent update goes through, or none.
 *
 * `TWILIO_ENABLED=false` switches Twilio off even when the credentials are present. Staging needs
 * that: Netlify will not store an empty value for one branch, so a branch deploy cannot blank out
 * the credentials it inherits, and without the switch staging would text real phone numbers.
 */
export class TwilioSettings {
	private constructor(
		readonly accountSid: string,
		readonly authToken: string,
		readonly messagingServiceSid: string,
	) {}

	static fromEnvironment(env: NodeJS.ProcessEnv = process.env): TwilioSettings | null {
		if (env.TWILIO_ENABLED?.trim().toLowerCase() === 'false') {
			return null;
		}

		const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID } = env;

		return TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_MESSAGING_SERVICE_SID
			? new TwilioSettings(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID)
			: null;
	}
}
