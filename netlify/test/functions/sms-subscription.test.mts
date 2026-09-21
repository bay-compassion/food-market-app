import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

const { consentManagerFromEnvironment, restoreWebsiteConsent } = vi.hoisted(() => ({
	consentManagerFromEnvironment: vi.fn(),
	restoreWebsiteConsent: vi.fn(),
}));

vi.mock('../../../db/index.mjs', () => ({ db }));
vi.mock('../../lib/deviceAuth.mjs', () => ({ authorizedGuest: vi.fn() }));
vi.mock('../../services/notifications.mjs', () => ({ requeueNotification: vi.fn() }));
vi.mock('../../services/smsNotifications.mjs', () => ({
	deliverPendingSmsNotifications: vi.fn(),
	sendSmsWelcome: vi.fn(),
	smsConfiguration: vi.fn(),
}));
vi.mock('../../services/twilio-consent.mjs', () => ({
	TwilioConsentManager: { fromEnvironment: consentManagerFromEnvironment },
}));

import { authorizedGuest } from '../../lib/deviceAuth.mjs';
import handler from '../../routes/notifications/sms-subscription.mjs';
import { requeueNotification } from '../../services/notifications.mjs';
import {
	deliverPendingSmsNotifications,
	sendSmsWelcome,
	smsConfiguration,
} from '../../services/smsNotifications.mjs';

const validToken = 'a'.repeat(40);
const guest = { id: 'guest-1', normalizedPhone: '+15551234567', locale: 'en', fake: false };

beforeEach(() => {
	consentManagerFromEnvironment.mockReturnValue({
		restoreWebsiteConsent,
	});
});

function request(method: string, options: { token?: string; body?: unknown } = {}) {
	const headers = new Headers();

	if (options.token) {
		headers.set('Authorization', `Bearer ${options.token}`);
	}

	if (options.body !== undefined) {
		headers.set('Content-Type', 'application/json');
	}

	return new Request('https://example.com/api/sms-subscription', {
		method,
		headers,
		body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
	});
}

afterEach(() => {
	resetDbStub();
	vi.mocked(smsConfiguration).mockReset();
	vi.mocked(authorizedGuest).mockReset();
	vi.mocked(requeueNotification).mockReset();
	vi.mocked(deliverPendingSmsNotifications).mockReset();
	vi.mocked(sendSmsWelcome).mockReset();
	consentManagerFromEnvironment.mockReset();
	restoreWebsiteConsent.mockReset();
});

describe('sms-subscription handler GET', () => {
	it('returns the public SMS configuration without requiring a token', async () => {
		vi.mocked(smsConfiguration).mockReturnValueOnce({ configured: true });

		const response = await handler(request('GET'));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ configured: true });
	});
});

describe('sms-subscription handler auth', () => {
	it('returns 503 when SMS notifications are not configured, before checking the token', async () => {
		vi.mocked(smsConfiguration).mockReturnValueOnce({ configured: false });

		const response = await handler(request('POST', { body: { consent: true } }));

		expect(response.status).toBe(503);
	});

	it('returns 401 when no guest matches the device token', async () => {
		vi.mocked(smsConfiguration).mockReturnValueOnce({ configured: true });
		vi.mocked(authorizedGuest).mockResolvedValueOnce(null);

		const response = await handler(request('POST', { token: validToken, body: { consent: true } }));

		expect(response.status).toBe(401);
	});
});

describe('sms-subscription handler POST', () => {
	it('rejects a request that does not explicitly consent', async () => {
		vi.mocked(smsConfiguration).mockReturnValueOnce({ configured: true });
		vi.mocked(authorizedGuest).mockResolvedValueOnce(guest);

		const response = await handler(
			request('POST', { token: validToken, body: { consent: false } }),
		);

		expect(response.status).toBe(400);
		expect(db.insert).not.toHaveBeenCalled();
	});

	it('subscribes and queues a status-appropriate notification for a new consent', async () => {
		vi.mocked(smsConfiguration).mockReturnValueOnce({ configured: true });
		vi.mocked(authorizedGuest).mockResolvedValueOnce(guest);
		queueResult([]); // existing subscription lookup
		queueResult([]); // stored STOP lookup
		queueResult(undefined); // insert...onConflictDoUpdate
		queueResult([{ id: 'event-1' }]); // current event lookup
		queueResult([{ id: 'visit-1', status: 'waiting' }]); // guest's current-market visit lookup
		vi.mocked(deliverPendingSmsNotifications).mockResolvedValueOnce({
			sent: 1,
			failed: 0,
			skipped: 0,
		});

		const response = await handler(request('POST', { token: validToken, body: { consent: true } }));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ subscribed: true });
		expect(requeueNotification).toHaveBeenCalledWith(
			db,
			['visit-1'],
			'lottery_selected',
			'lottery_selected',
			['sms'],
		);
		expect(sendSmsWelcome).toHaveBeenCalledWith(guest);
		expect(consentManagerFromEnvironment).not.toHaveBeenCalled();
	});

	it('welcomes a new subscriber without replaying a registration text', async () => {
		vi.mocked(smsConfiguration).mockReturnValueOnce({ configured: true });
		vi.mocked(authorizedGuest).mockResolvedValueOnce(guest);
		queueResult([]); // existing subscription lookup
		queueResult([]); // stored STOP lookup
		queueResult(undefined); // insert...onConflictDoUpdate
		queueResult([{ id: 'event-1' }]); // current event lookup
		queueResult([{ id: 'visit-1', status: 'registered' }]); // guest's current-market visit lookup

		const response = await handler(request('POST', { token: validToken, body: { consent: true } }));

		expect(response.status).toBe(200);
		expect(sendSmsWelcome).toHaveBeenCalledWith(guest);
		expect(requeueNotification).not.toHaveBeenCalled();
		expect(deliverPendingSmsNotifications).not.toHaveBeenCalled();
	});

	it('subscribes without a catch-up notification when the guest has no current-market visit', async () => {
		vi.mocked(smsConfiguration).mockReturnValueOnce({ configured: true });
		vi.mocked(authorizedGuest).mockResolvedValueOnce(guest);
		queueResult([]); // existing subscription lookup
		queueResult([]); // stored STOP lookup
		queueResult(undefined); // insert...onConflictDoUpdate
		queueResult([{ id: 'event-1' }]); // current event lookup
		queueResult([]); // guest's current-market visit lookup

		const response = await handler(request('POST', { token: validToken, body: { consent: true } }));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ subscribed: true });
		expect(requeueNotification).not.toHaveBeenCalled();
		expect(deliverPendingSmsNotifications).not.toHaveBeenCalled();
	});

	it('does not queue a duplicate notification when already consented', async () => {
		vi.mocked(smsConfiguration).mockReturnValueOnce({ configured: true });
		vi.mocked(authorizedGuest).mockResolvedValueOnce(guest);
		queueResult([{ guestId: 'guest-1' }]); // already consented
		queueResult([]); // stored STOP lookup
		queueResult(undefined); // insert...onConflictDoUpdate

		const response = await handler(request('POST', { token: validToken, body: { consent: true } }));

		expect(response.status).toBe(200);
		expect(sendSmsWelcome).not.toHaveBeenCalled();
		expect(requeueNotification).not.toHaveBeenCalled();
		expect(deliverPendingSmsNotifications).not.toHaveBeenCalled();
	});

	it('clears Twilio blocks before restoring a locally tracked STOP', async () => {
		vi.mocked(smsConfiguration).mockReturnValueOnce({ configured: true });
		vi.mocked(authorizedGuest).mockResolvedValueOnce(guest);
		queueResult([]); // existing subscription lookup
		queueResult([{ senderPhone: '+15557654321' }]); // stored STOP lookup
		queueResult(undefined); // delete stored STOP
		queueResult(undefined); // insert...onConflictDoUpdate
		queueResult([]); // current event lookup

		const response = await handler(request('POST', { token: validToken, body: { consent: true } }));

		expect(response.status).toBe(200);
		expect(restoreWebsiteConsent).toHaveBeenCalledWith(
			'+15551234567',
			'+15557654321',
			expect.any(Date),
		);
		expect(db.delete).toHaveBeenCalledTimes(1);
		expect(db.insert).toHaveBeenCalledTimes(1);
	});

	it('remains unsubscribed when Twilio cannot restore consent', async () => {
		vi.mocked(smsConfiguration).mockReturnValueOnce({ configured: true });
		vi.mocked(authorizedGuest).mockResolvedValueOnce(guest);
		restoreWebsiteConsent.mockRejectedValueOnce(new Error('Consent API access denied'));
		queueResult([]); // existing subscription lookup
		queueResult([{ senderPhone: '+15557654321' }]); // stored STOP lookup

		const response = await handler(request('POST', { token: validToken, body: { consent: true } }));

		expect(response.status).toBe(502);
		expect(db.delete).not.toHaveBeenCalled();
		expect(db.insert).not.toHaveBeenCalled();
	});
});

describe('sms-subscription handler DELETE', () => {
	it('removes the subscription for the authorized guest', async () => {
		vi.mocked(smsConfiguration).mockReturnValueOnce({ configured: true });
		vi.mocked(authorizedGuest).mockResolvedValueOnce(guest);
		queueResult(undefined);

		const response = await handler(request('DELETE', { token: validToken }));

		expect(response.status).toBe(204);
		expect(db.delete).toHaveBeenCalledTimes(1);
	});
});

describe('sms-subscription handler method routing', () => {
	it('returns 405 for unsupported methods', async () => {
		vi.mocked(smsConfiguration).mockReturnValueOnce({ configured: true });
		vi.mocked(authorizedGuest).mockResolvedValueOnce(guest);

		const response = await handler(request('PUT', { token: validToken }));

		expect(response.status).toBe(405);
	});
});
