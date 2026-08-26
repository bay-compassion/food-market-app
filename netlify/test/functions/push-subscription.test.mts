import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));
vi.mock('../../services/pushNotifications.mjs', () => ({
	deliverPendingNotifications: vi.fn(),
	pushConfiguration: vi.fn(),
}));

import handler from '../../functions/push-subscription.mjs';
import {
	deliverPendingNotifications,
	pushConfiguration,
} from '../../services/pushNotifications.mjs';

const validToken = 'a'.repeat(40);
const validSubscription = {
	endpoint: 'https://push.example.com/endpoint-1',
	keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
};

function request(method: string, options: { token?: string; body?: unknown } = {}) {
	const headers = new Headers();

	if (options.token) {
		headers.set('Authorization', `Bearer ${options.token}`);
	}

	return new Request('https://example.com/api/push-subscription', {
		method,
		headers,
		body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
	});
}

afterEach(() => {
	resetDbStub();
	vi.mocked(pushConfiguration).mockReset();
	vi.mocked(deliverPendingNotifications).mockReset();
});

describe('push-subscription handler GET', () => {
	it('returns the public push configuration without requiring a token', async () => {
		vi.mocked(pushConfiguration).mockReturnValueOnce({ configured: true, publicKey: 'key' });

		const response = await handler(request('GET'));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ configured: true, publicKey: 'key' });
	});
});

describe('push-subscription handler auth', () => {
	it('returns 503 when push notifications are not configured, before checking the token', async () => {
		vi.mocked(pushConfiguration).mockReturnValueOnce({ configured: false, publicKey: null });

		const response = await handler(request('POST', { body: validSubscription }));

		expect(response.status).toBe(503);
	});

	it('returns 401 when no visit matches the token', async () => {
		vi.mocked(pushConfiguration).mockReturnValueOnce({ configured: true, publicKey: 'key' });
		queueResult([]);

		const response = await handler(request('POST', { token: validToken, body: validSubscription }));

		expect(response.status).toBe(401);
	});
});

describe('push-subscription handler POST', () => {
	it('returns 400 for an invalid subscription payload', async () => {
		vi.mocked(pushConfiguration).mockReturnValueOnce({ configured: true, publicKey: 'key' });
		queueResult([{ id: 'visit-1', status: 'registered' }]);

		const response = await handler(
			request('POST', { token: validToken, body: { endpoint: 'not-https' } }),
		);

		expect(response.status).toBe(400);
	});

	it('subscribes and queues a status-appropriate notification for a new endpoint', async () => {
		vi.mocked(pushConfiguration).mockReturnValueOnce({ configured: true, publicKey: 'key' });
		queueResult([{ id: 'visit-1', status: 'waiting' }]); // authorizedVisit
		queueResult([]); // existing subscription lookup
		queueResult(undefined); // tx.delete
		queueResult(undefined); // tx.insert...onConflictDoUpdate
		queueResult(undefined); // notificationDeliveries insert
		vi.mocked(deliverPendingNotifications).mockResolvedValueOnce({
			sent: 1,
			failed: 0,
			skipped: 0,
		});

		const response = await handler(request('POST', { token: validToken, body: validSubscription }));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ subscribed: true });
		expect(deliverPendingNotifications).toHaveBeenCalledWith(
			expect.objectContaining({ visitIds: ['visit-1'], types: ['lottery_selected'] }),
		);
	});

	it('does not queue a duplicate notification when re-subscribing the same visit and endpoint', async () => {
		vi.mocked(pushConfiguration).mockReturnValueOnce({ configured: true, publicKey: 'key' });
		queueResult([{ id: 'visit-1', status: 'waiting' }]); // authorizedVisit
		queueResult([{ visitId: 'visit-1' }]); // existing subscription already belongs to this visit
		queueResult(undefined); // tx.delete
		queueResult(undefined); // tx.insert...onConflictDoUpdate

		const response = await handler(request('POST', { token: validToken, body: validSubscription }));

		expect(response.status).toBe(200);
		expect(deliverPendingNotifications).not.toHaveBeenCalled();
	});

	it(
		'known gap: does not check whether the visit session has ended before subscribing ' +
			'(unlike visit.ts, which rejects ended sessions) — see docs/migrations.md sibling ' +
			'follow-up ticket for tightening this',
		async () => {
			vi.mocked(pushConfiguration).mockReturnValueOnce({ configured: true, publicKey: 'key' });
			queueResult([{ id: 'visit-1', status: 'served' }]); // no sessionStatus check at all
			queueResult([]);
			queueResult(undefined);
			queueResult(undefined);
			queueResult(undefined);
			vi.mocked(deliverPendingNotifications).mockResolvedValueOnce({
				sent: 0,
				failed: 0,
				skipped: 0,
			});

			const response = await handler(
				request('POST', { token: validToken, body: validSubscription }),
			);

			expect(response.status).toBe(200);
		},
	);
});

describe('push-subscription handler DELETE', () => {
	it('removes the subscription for the authorized visit', async () => {
		vi.mocked(pushConfiguration).mockReturnValueOnce({ configured: true, publicKey: 'key' });
		queueResult([{ id: 'visit-1', status: 'registered' }]);
		queueResult(undefined);

		const response = await handler(request('DELETE', { token: validToken }));

		expect(response.status).toBe(204);
		expect(db.delete).toHaveBeenCalledTimes(1);
	});
});

describe('push-subscription handler method routing', () => {
	it('returns 405 for unsupported methods', async () => {
		vi.mocked(pushConfiguration).mockReturnValueOnce({ configured: true, publicKey: 'key' });
		queueResult([{ id: 'visit-1', status: 'registered' }]);

		const response = await handler(request('PUT', { token: validToken }));

		expect(response.status).toBe(405);
	});
});
