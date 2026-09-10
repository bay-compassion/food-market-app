import { afterEach, describe, expect, it, vi } from 'vitest';

const messagesCreate = vi.fn();

vi.mock('twilio', () => ({
	default: vi.fn(() => ({ messages: { create: messagesCreate } })),
}));

import { TwilioSmsTransport } from './sms-transport.mjs';

const twilioEnv = {
	TWILIO_ACCOUNT_SID: 'account-sid',
	TWILIO_AUTH_TOKEN: 'auth-token',
	TWILIO_MESSAGING_SERVICE_SID: 'messaging-service-sid',
};

afterEach(() => {
	messagesCreate.mockReset();
	vi.unstubAllEnvs();
});

describe('TwilioSmsTransport', () => {
	it('is unavailable unless every provider setting is present', () => {
		expect(TwilioSmsTransport.configured()).toBe(false);
		expect(TwilioSmsTransport.fromEnvironment()).toBeNull();
	});

	it('submits a message through the configured Messaging Service', async () => {
		for (const [key, value] of Object.entries(twilioEnv)) {
			vi.stubEnv(key, value);
		}
		messagesCreate.mockResolvedValueOnce({ sid: 'SM123' });
		const transport = TwilioSmsTransport.fromEnvironment();

		const result = await transport!.send({
			to: '+15005550006',
			body: 'Test message',
		});

		expect(messagesCreate).toHaveBeenCalledWith({
			messagingServiceSid: 'messaging-service-sid',
			to: '+15005550006',
			body: 'Test message',
		});
		expect(result).toEqual({ providerMessageId: 'SM123' });
	});
});
