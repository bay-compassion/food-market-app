import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));
vi.mock('../../lib/deviceAuth.mjs', () => ({ authorizedGuest: vi.fn() }));

import { authorizedGuest } from '../../lib/deviceAuth.mjs';
import handler from '../../routes/notifications/notification-status.mjs';

afterEach(() => {
	resetDbStub();
	vi.mocked(authorizedGuest).mockReset();
});

function request(method = 'GET') {
	return new Request('https://example.com/api/notification-status', { method });
}

describe('notification-status handler', () => {
	it('requires a recognized device', async () => {
		vi.mocked(authorizedGuest).mockResolvedValueOnce(null);

		const response = await handler(request());

		expect(response.status).toBe(401);
		expect(db.select).not.toHaveBeenCalled();
	});

	it('returns subscription status across the recognized guest’s visits', async () => {
		vi.mocked(authorizedGuest).mockResolvedValueOnce({
			id: 'guest-1',
			normalizedPhone: '+15551234567',
			locale: 'en',
			fake: false,
		});
		queueResult([{ id: 'push-1' }]);
		queueResult([{ id: 'sms-1' }]);
		queueResult([]);

		const response = await handler(request());

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			pushSubscribed: true,
			smsConsented: true,
			smsOptOutSender: null,
		});
	});

	it('returns false for channels the guest has not enabled', async () => {
		vi.mocked(authorizedGuest).mockResolvedValueOnce({
			id: 'guest-1',
			normalizedPhone: '+15551234567',
			locale: 'en',
			fake: false,
		});
		queueResult([]);
		queueResult([]);
		queueResult([]);

		const response = await handler(request());

		await expect(response.json()).resolves.toEqual({
			pushSubscribed: false,
			smsConsented: false,
			smsOptOutSender: null,
		});
	});

	it('returns the sender that received an active STOP if the guest previously opted out', async () => {
		vi.mocked(authorizedGuest).mockResolvedValueOnce({
			id: 'guest-1',
			normalizedPhone: '+15551234567',
			locale: 'en',
			fake: false,
		});
		queueResult([]);
		queueResult([]);
		queueResult([{ senderPhone: '+19254718587' }]);

		const response = await handler(request());

		await expect(response.json()).resolves.toEqual({
			pushSubscribed: false,
			smsConsented: false,
			smsOptOutSender: '+19254718587',
		});
	});

	it('rejects unsupported methods before authenticating', async () => {
		const response = await handler(request('POST'));

		expect(response.status).toBe(405);
		expect(authorizedGuest).not.toHaveBeenCalled();
	});
});
