import { describe, expect, it } from 'vitest';

import { TwilioSettings } from './twilio-settings.mjs';

const credentials = {
	TWILIO_ACCOUNT_SID: 'AC00000000000000000000000000000000',
	TWILIO_AUTH_TOKEN: 'auth-token',
	TWILIO_MESSAGING_SERVICE_SID: 'MG00000000000000000000000000000000',
};

describe('TwilioSettings', () => {
	it('reads every credential when all three are present', () => {
		// Arrange
		const env = { ...credentials };

		// Act
		const settings = TwilioSettings.fromEnvironment(env);

		// Assert
		expect(settings).toMatchObject({
			accountSid: credentials.TWILIO_ACCOUNT_SID,
			authToken: credentials.TWILIO_AUTH_TOKEN,
			messagingServiceSid: credentials.TWILIO_MESSAGING_SERVICE_SID,
		});
	});

	it('is absent when a credential is missing', () => {
		// Arrange
		const env = { ...credentials, TWILIO_AUTH_TOKEN: '' };

		// Act
		const settings = TwilioSettings.fromEnvironment(env);

		// Assert
		expect(settings).toBeNull();
	});

	it.each(['false', 'FALSE', ' false '])(
		'is absent when TWILIO_ENABLED is %j, even with every credential',
		(value) => {
			// Arrange
			const env = { ...credentials, TWILIO_ENABLED: value };

			// Act
			const settings = TwilioSettings.fromEnvironment(env);

			// Assert
			expect(settings).toBeNull();
		},
	);

	it('stays on when TWILIO_ENABLED is true', () => {
		// Arrange
		const env = { ...credentials, TWILIO_ENABLED: 'true' };

		// Act
		const settings = TwilioSettings.fromEnvironment(env);

		// Assert
		expect(settings).not.toBeNull();
	});
});
