import { afterEach, describe, expect, it, vi } from 'vitest';

const { bulkConsentsCreate } = vi.hoisted(() => ({ bulkConsentsCreate: vi.fn() }));

vi.mock('twilio', () => ({
	default: vi.fn(() => ({
		accounts: { v1: { bulkConsents: { create: bulkConsentsCreate } } },
	})),
}));

import { TwilioConsentManager } from './twilio-consent.mjs';

const twilioEnv = {
	TWILIO_ACCOUNT_SID: 'AC00000000000000000000000000000000',
	TWILIO_AUTH_TOKEN: 'auth-token',
	TWILIO_MESSAGING_SERVICE_SID: 'MG00000000000000000000000000000000',
};

function configureTwilio() {
	for (const [key, value] of Object.entries(twilioEnv)) {
		vi.stubEnv(key, value);
	}
}

afterEach(() => {
	bulkConsentsCreate.mockReset();
	vi.unstubAllEnvs();
});

describe('TwilioConsentManager', () => {
	it('is unavailable unless every provider setting is present', () => {
		expect(TwilioConsentManager.fromEnvironment()).toBeNull();
	});

	it('restores both Messaging Service and sender-level website consent', async () => {
		configureTwilio();
		bulkConsentsCreate.mockImplementationOnce(
			({ items }: { items: Array<{ correlation_id: string }> }) =>
				Promise.resolve({
					items: items.map(({ correlation_id }) => ({ correlation_id, error_code: 0 })),
				}),
		);
		const consentedAt = new Date('2026-09-11T08:00:00.000Z');
		const manager = TwilioConsentManager.fromEnvironment();

		await manager!.restoreWebsiteConsent('+15551234567', '+15557654321', consentedAt);

		expect(bulkConsentsCreate).toHaveBeenCalledOnce();
		const [{ items }] = bulkConsentsCreate.mock.calls[0] as [
			{ items: Array<Record<string, unknown>> },
		];

		expect(items).toEqual([
			{
				contact_id: '+15551234567',
				correlation_id: expect.stringMatching(/^[0-9a-f]{32}$/),
				sender_id: twilioEnv.TWILIO_MESSAGING_SERVICE_SID,
				status: 'opt-in',
				source: 'website',
				date_of_consent: consentedAt.toISOString(),
			},
			{
				contact_id: '+15551234567',
				correlation_id: expect.stringMatching(/^[0-9a-f]{32}$/),
				sender_id: '+15557654321',
				status: 'opt-in',
				source: 'website',
				date_of_consent: consentedAt.toISOString(),
			},
		]);
		expect(items[0]?.correlation_id).not.toBe(items[1]?.correlation_id);
	});

	it('rejects a partial item failure from Twilio', async () => {
		configureTwilio();
		bulkConsentsCreate.mockImplementationOnce(
			({ items }: { items: Array<{ correlation_id: string }> }) =>
				Promise.resolve({
					items: items.map(({ correlation_id }, index) => ({
						correlation_id,
						error_code: index === 0 ? 0 : 30_001,
					})),
				}),
		);
		const manager = TwilioConsentManager.fromEnvironment();

		await expect(
			manager!.restoreWebsiteConsent(
				'+15551234567',
				'+15557654321',
				new Date('2026-09-11T08:00:00.000Z'),
			),
		).rejects.toThrow('Twilio Consent API rejected 1 item(s) with code(s) 30001');
	});
});
