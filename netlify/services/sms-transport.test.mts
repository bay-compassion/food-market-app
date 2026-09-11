import { afterEach, describe, expect, it, vi } from 'vitest';

const messagesCreate = vi.fn();
const { logSmsDelivery } = vi.hoisted(() => ({ logSmsDelivery: vi.fn() }));

vi.mock('twilio', () => ({
	default: vi.fn(() => ({ messages: { create: messagesCreate } })),
}));
vi.mock('../lib/logging.mjs', () => ({ logSmsDelivery }));

import { TwilioSmsTransport } from './sms-transport.mjs';

const twilioEnv = {
	TWILIO_ACCOUNT_SID: 'account-sid',
	TWILIO_AUTH_TOKEN: 'auth-token',
	TWILIO_MESSAGING_SERVICE_SID: 'messaging-service-sid',
};

afterEach(() => {
	messagesCreate.mockReset();
	logSmsDelivery.mockReset();
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
		expect(logSmsDelivery).toHaveBeenCalledWith('+15005550006', 'Test message');
		expect(result).toEqual({ providerMessageId: 'SM123' });
	});

	it('still submits a message when delivery logging fails', async () => {
		for (const [key, value] of Object.entries(twilioEnv)) {
			vi.stubEnv(key, value);
		}
		logSmsDelivery.mockImplementationOnce(() => {
			throw new Error('read-only log destination');
		});
		messagesCreate.mockResolvedValueOnce({ sid: 'SM123' });
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const transport = TwilioSmsTransport.fromEnvironment();

		const result = await transport!.send({
			to: '+15005550006',
			body: 'Test message',
		});

		expect(messagesCreate).toHaveBeenCalledOnce();
		expect(warn).toHaveBeenCalledWith('SMS delivery logging failed.');
		expect(result).toEqual({ providerMessageId: 'SM123' });
		warn.mockRestore();
	});
});
