import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));
vi.mock('../../lib/visitAuth.mjs', () => ({ authorizedVisit: vi.fn() }));
vi.mock('../../services/notifications.mjs', () => ({ requeueNotification: vi.fn() }));
vi.mock('../../services/smsNotifications.mjs', () => ({
	deliverPendingSmsNotifications: vi.fn(),
	smsConfiguration: vi.fn(),
}));

import handler from '../../functions/sms-subscription.mjs';
import { authorizedVisit } from '../../lib/visitAuth.mjs';
import { requeueNotification } from '../../services/notifications.mjs';
import {
	deliverPendingSmsNotifications,
	smsConfiguration,
} from '../../services/smsNotifications.mjs';

const validToken = 'a'.repeat(40);

function request(method: string, options: { token?: string; body?: unknown } = {}) {
	const headers = new Headers();

	if (options.token) {
		headers.set('Authorization', `Bearer ${options.token}`);
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
	vi.mocked(authorizedVisit).mockReset();
	vi.mocked(requeueNotification).mockReset();
	vi.mocked(deliverPendingSmsNotifications).mockReset();
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

	it('returns 401 when no visit matches the token', async () => {
		vi.mocked(smsConfiguration).mockReturnValueOnce({ configured: true });
		vi.mocked(authorizedVisit).mockResolvedValueOnce(null);

		const response = await handler(request('POST', { token: validToken, body: { consent: true } }));

		expect(response.status).toBe(401);
	});
});

describe('sms-subscription handler POST', () => {
	it('rejects a request that does not explicitly consent', async () => {
		vi.mocked(smsConfiguration).mockReturnValueOnce({ configured: true });
		vi.mocked(authorizedVisit).mockResolvedValueOnce({ id: 'visit-1', status: 'waiting' });

		const response = await handler(
			request('POST', { token: validToken, body: { consent: false } }),
		);

		expect(response.status).toBe(400);
		expect(db.insert).not.toHaveBeenCalled();
	});

	it('subscribes and queues a status-appropriate notification for a new consent', async () => {
		vi.mocked(smsConfiguration).mockReturnValueOnce({ configured: true });
		vi.mocked(authorizedVisit).mockResolvedValueOnce({ id: 'visit-1', status: 'waiting' });
		queueResult([]); // existing subscription lookup
		queueResult(undefined); // insert...onConflictDoUpdate
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
	});

	it('does not queue a duplicate notification when already consented', async () => {
		vi.mocked(smsConfiguration).mockReturnValueOnce({ configured: true });
		vi.mocked(authorizedVisit).mockResolvedValueOnce({ id: 'visit-1', status: 'waiting' });
		queueResult([{ visitId: 'visit-1' }]); // already consented
		queueResult(undefined); // insert...onConflictDoUpdate

		const response = await handler(request('POST', { token: validToken, body: { consent: true } }));

		expect(response.status).toBe(200);
		expect(requeueNotification).not.toHaveBeenCalled();
		expect(deliverPendingSmsNotifications).not.toHaveBeenCalled();
	});
});

describe('sms-subscription handler DELETE', () => {
	it('removes the subscription for the authorized visit', async () => {
		vi.mocked(smsConfiguration).mockReturnValueOnce({ configured: true });
		vi.mocked(authorizedVisit).mockResolvedValueOnce({ id: 'visit-1', status: 'registered' });
		queueResult(undefined);

		const response = await handler(request('DELETE', { token: validToken }));

		expect(response.status).toBe(204);
		expect(db.delete).toHaveBeenCalledTimes(1);
	});
});

describe('sms-subscription handler method routing', () => {
	it('returns 405 for unsupported methods', async () => {
		vi.mocked(smsConfiguration).mockReturnValueOnce({ configured: true });
		vi.mocked(authorizedVisit).mockResolvedValueOnce({ id: 'visit-1', status: 'registered' });

		const response = await handler(request('PUT', { token: validToken }));

		expect(response.status).toBe(405);
	});
});
