import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../test/dbStub.mjs';

const messagesCreate = vi.fn();

vi.mock('../../db/index.mjs', () => ({ db }));
vi.mock('twilio', () => ({
	default: vi.fn(() => ({ messages: { create: messagesCreate } })),
}));

import { deliverPendingSmsNotifications, smsConfiguration } from './smsNotifications.mjs';

const twilioEnv = {
	TWILIO_ACCOUNT_SID: 'account-sid',
	TWILIO_AUTH_TOKEN: 'auth-token',
	TWILIO_MESSAGING_SERVICE_SID: 'messaging-service-sid',
};

function stubTwilioEnv() {
	for (const [key, value] of Object.entries(twilioEnv)) {
		vi.stubEnv(key, value);
	}
}

afterEach(() => {
	resetDbStub();
	messagesCreate.mockReset();
	vi.unstubAllEnvs();
});

describe('sms notification configuration', () => {
	it('is unconfigured when Twilio credentials are missing', () => {
		expect(smsConfiguration()).toEqual({ configured: false });
	});

	it('is configured once every Twilio credential is present', () => {
		stubTwilioEnv();

		expect(smsConfiguration()).toEqual({ configured: true });
	});

	it('stays unconfigured when notifications are globally disabled', () => {
		stubTwilioEnv();
		vi.stubEnv('NOTIFICATIONS_ENABLED', 'false');

		expect(smsConfiguration()).toEqual({ configured: false });
	});
});

describe('deliverPendingSmsNotifications', () => {
	it('does nothing and never touches the database when unconfigured', async () => {
		const result = await deliverPendingSmsNotifications();

		expect(result).toEqual({ sent: 0, failed: 0, skipped: 0 });
		expect(db.select).not.toHaveBeenCalled();
	});

	it('sends a text and marks the delivery sent', async () => {
		stubTwilioEnv();
		queueResult([
			{
				id: 'delivery-1',
				visitId: 'visit-1',
				guestId: 'guest-1',
				attempts: 0,
				type: 'called',
				title: null,
				body: null,
				locale: 'en',
				phone: '+15551234567',
				subscribed: 'sms-sub-1',
			},
		]);
		messagesCreate.mockResolvedValueOnce({});
		queueResult(undefined); // update -> sent

		const result = await deliverPendingSmsNotifications();

		expect(result).toEqual({ sent: 1, failed: 0, skipped: 0 });
		expect(messagesCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				messagingServiceSid: 'messaging-service-sid',
				to: '+15551234567',
			}),
		);
	});

	it('skips a delivery with no active SMS subscription', async () => {
		stubTwilioEnv();
		queueResult([
			{
				id: 'delivery-1',
				visitId: 'visit-1',
				guestId: 'guest-1',
				attempts: 0,
				type: 'called',
				title: null,
				body: null,
				locale: 'en',
				phone: '+15551234567',
				subscribed: null,
			},
		]);
		queueResult(undefined); // update -> skipped

		const result = await deliverPendingSmsNotifications();

		expect(result).toEqual({ sent: 0, failed: 0, skipped: 1 });
		expect(messagesCreate).not.toHaveBeenCalled();
	});

	it('deletes the subscription and fails immediately on a permanent Twilio error', async () => {
		stubTwilioEnv();
		queueResult([
			{
				id: 'delivery-1',
				visitId: 'visit-1',
				guestId: 'guest-1',
				attempts: 0,
				type: 'called',
				title: null,
				body: null,
				locale: 'en',
				phone: '+15551234567',
				subscribed: 'sms-sub-1',
			},
		]);
		messagesCreate.mockRejectedValueOnce(
			Object.assign(new Error('Unsubscribed recipient'), { code: 21610 }),
		);
		queueResult(undefined); // delete sms_subscriptions
		queueResult(undefined); // update -> failed

		const result = await deliverPendingSmsNotifications();

		expect(result).toEqual({ sent: 0, failed: 1, skipped: 0 });
		expect(db.delete).toHaveBeenCalledTimes(1);
	});

	it('leaves a transient failure pending for retry instead of deleting the subscription', async () => {
		stubTwilioEnv();
		queueResult([
			{
				id: 'delivery-1',
				visitId: 'visit-1',
				guestId: 'guest-1',
				attempts: 0,
				type: 'called',
				title: null,
				body: null,
				locale: 'en',
				phone: '+15551234567',
				subscribed: 'sms-sub-1',
			},
		]);
		messagesCreate.mockRejectedValueOnce(new Error('Network error'));
		queueResult(undefined); // update -> pending

		const result = await deliverPendingSmsNotifications();

		expect(result).toEqual({ sent: 0, failed: 1, skipped: 0 });
		expect(db.delete).not.toHaveBeenCalled();
	});
});
