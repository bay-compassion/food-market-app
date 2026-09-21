import { afterEach, describe, expect, it, vi } from 'vitest';

import { languages, translations } from '../../src/locales.js';
import { db, queueResult, resetDbStub } from '../test/dbStub.mjs';

const messagesCreate = vi.fn();

vi.mock('../../db/index.mjs', () => ({ db }));
vi.mock('twilio', () => ({
	default: vi.fn(() => ({ messages: { create: messagesCreate } })),
}));

import {
	deliverPendingSmsNotifications,
	sendSmsWelcome,
	smsConfiguration,
	smsMessage,
} from './smsNotifications.mjs';

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

describe('smsMessage', () => {
	it('wraps every localized notification in the required English compliance copy', () => {
		for (const { code } of languages) {
			const message = smsMessage(code, 'called', null);

			expect(message).toMatch(/^The Bay Compassion: /);
			expect(message).toContain(translations[code].smsNotificationCalled);
			expect(message).toMatch(/Reply STOP to unsubscribe$/);
		}
	});

	it('welcomes a guest who has just consented, in one line', () => {
		expect(smsMessage('en', 'welcome', null)).toBe(
			'The Bay Compassion: Welcome! You are now set up to receive text updates. Reply STOP to unsubscribe',
		);
	});

	it('includes the guest queue position in a localized lottery-selection message', () => {
		expect(smsMessage('es', 'lottery_selected', 12)).toBe(
			'The Bay Compassion: ¡Fue seleccionado! Su lugar en la fila es 12. Espere hasta que le llamemos. ' +
				'Reply STOP to unsubscribe',
		);
	});

	it('refuses a lottery-selection message with no queue position', () => {
		expect(() => smsMessage('en', 'lottery_selected', null)).toThrow(/queue position/);
	});

	it('joins a broadcast’s title and body', () => {
		expect(
			smsMessage('en', 'broadcast', null, { title: 'Market update', body: 'Running late.' }),
		).toBe('The Bay Compassion: Market update: Running late. Reply STOP to unsubscribe');
	});
});

describe('sendSmsWelcome', () => {
	const guest = { normalizedPhone: '+15551234567', locale: 'es', fake: false };

	it('texts the welcome in the guest’s language', async () => {
		stubTwilioEnv();
		messagesCreate.mockResolvedValueOnce({});

		await sendSmsWelcome(guest);

		expect(messagesCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				to: '+15551234567',
				body: smsMessage('es', 'welcome', null),
			}),
		);
	});

	it('falls back to English for a locale it has no translation for', async () => {
		stubTwilioEnv();
		messagesCreate.mockResolvedValueOnce({});

		await sendSmsWelcome({ ...guest, locale: 'xx' });

		expect(messagesCreate).toHaveBeenCalledWith(
			expect.objectContaining({ body: smsMessage('en', 'welcome', null) }),
		);
	});

	it('sends nothing to a fake guest', async () => {
		stubTwilioEnv();

		await sendSmsWelcome({ ...guest, fake: true });

		expect(messagesCreate).not.toHaveBeenCalled();
	});

	it('sends nothing when unconfigured', async () => {
		await sendSmsWelcome(guest);

		expect(messagesCreate).not.toHaveBeenCalled();
	});

	it('does not throw when Twilio rejects the welcome', async () => {
		stubTwilioEnv();
		messagesCreate.mockRejectedValueOnce(new Error('Network error'));

		await expect(sendSmsWelcome(guest)).resolves.toBeUndefined();
	});
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

		expect(result).toEqual({ sent: 0, failed: 0, skipped: 0, processed: 0 });
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
				queuePosition: 1,
				fake: false,
				subscribed: 'sms-sub-1',
			},
		]);
		queueResult(undefined); // claim delivery
		messagesCreate.mockResolvedValueOnce({});
		queueResult(undefined); // update -> sent

		const result = await deliverPendingSmsNotifications();

		expect(result).toEqual({ sent: 1, failed: 0, skipped: 0, processed: 1 });
		expect(messagesCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				messagingServiceSid: 'messaging-service-sid',
				to: '+15551234567',
				body: 'The Bay Compassion: It’s your turn. Please come to the entrance now. Reply STOP to unsubscribe',
			}),
		);
	});

	it('skips a fake guest without calling Twilio', async () => {
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
				fake: true,
				subscribed: 'sms-sub-1',
			},
		]);
		queueResult(undefined); // claim delivery
		queueResult(undefined); // update -> skipped

		const result = await deliverPendingSmsNotifications();

		expect(result).toEqual({ sent: 0, failed: 0, skipped: 1, processed: 1 });
		expect(messagesCreate).not.toHaveBeenCalled();
	});

	it('skips a queued type that no longer has a text message', async () => {
		stubTwilioEnv();
		queueResult([
			{
				id: 'delivery-1',
				visitId: 'visit-1',
				guestId: 'guest-1',
				attempts: 0,
				type: 'registration_closed',
				title: null,
				body: null,
				locale: 'en',
				phone: '+15551234567',
				fake: false,
				subscribed: 'sms-sub-1',
			},
		]);
		queueResult(undefined); // claim delivery
		queueResult(undefined); // update -> skipped

		const result = await deliverPendingSmsNotifications();

		expect(result).toEqual({ sent: 0, failed: 0, skipped: 1, processed: 1 });
		expect(messagesCreate).not.toHaveBeenCalled();
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
				fake: false,
				subscribed: null,
			},
		]);
		queueResult(undefined); // claim delivery
		queueResult(undefined); // update -> skipped

		const result = await deliverPendingSmsNotifications();

		expect(result).toEqual({ sent: 0, failed: 0, skipped: 1, processed: 1 });
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
				fake: false,
				subscribed: 'sms-sub-1',
			},
		]);
		queueResult(undefined); // claim delivery
		messagesCreate.mockRejectedValueOnce(
			Object.assign(new Error('Unsubscribed recipient'), { code: 21610 }),
		);
		queueResult(undefined); // delete sms_subscriptions
		queueResult(undefined); // update -> failed

		const result = await deliverPendingSmsNotifications();

		expect(result).toEqual({ sent: 0, failed: 1, skipped: 0, processed: 1 });
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
				fake: false,
				subscribed: 'sms-sub-1',
			},
		]);
		queueResult(undefined); // claim delivery
		messagesCreate.mockRejectedValueOnce(new Error('Network error'));
		queueResult(undefined); // update -> pending

		const result = await deliverPendingSmsNotifications();

		expect(result).toEqual({ sent: 0, failed: 1, skipped: 0, processed: 1 });
		expect(db.delete).not.toHaveBeenCalled();
	});
});
