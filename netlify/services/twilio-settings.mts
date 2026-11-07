/**
 * The Twilio account every outbound message and consent update goes through, or none.
 *
 * `TWILIO_ENABLED=false` switches Twilio off even when the credentials are present, so a deploy that
 * inherits them — Netlify will not store an empty value for one context or branch — can still be
 * kept from texting real phone numbers. Staging sets it as a second guard behind having no
 * credentials at all.
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
