import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.js';

vi.mock('../../../db/index.js', () => ({ db }));
vi.mock('../../lib/auth.js', () => ({ requireAuth0: vi.fn() }));
vi.mock('../../services/pushNotifications.js', () => ({
	deliverPendingNotifications: vi.fn(),
	pushConfiguration: vi.fn(),
}));

import handler from '../../functions/broadcast.js';
import { requireAuth0 } from '../../lib/auth.js';
import {
	deliverPendingNotifications,
	pushConfiguration,
} from '../../services/pushNotifications.js';

function request(body?: unknown, rawBody?: string) {
	return new Request('https://example.com/api/broadcast', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: rawBody ?? (body !== undefined ? JSON.stringify(body) : undefined),
	});
}

afterEach(() => {
	resetDbStub();
	vi.mocked(requireAuth0).mockReset();
	vi.mocked(pushConfiguration).mockReset();
	vi.mocked(deliverPendingNotifications).mockReset();
});

describe('broadcast handler', () => {
	it('returns 405 for non-POST requests', async () => {
		const response = await handler(new Request('https://example.com/api/broadcast'));

		expect(response.status).toBe(405);
		expect(requireAuth0).not.toHaveBeenCalled();
	});

	it('returns the requireAuth0 response when unauthorized', async () => {
		const unauthorized = Response.json({ error: 'Authorization required.' }, { status: 401 });
		vi.mocked(requireAuth0).mockResolvedValueOnce(unauthorized);

		const response = await handler(request({ title: 'Hi', body: 'Hello' }));

		expect(response).toBe(unauthorized);
	});

	it('returns 503 when push notifications are not configured', async () => {
		vi.mocked(requireAuth0).mockResolvedValueOnce(null);
		vi.mocked(pushConfiguration).mockReturnValueOnce({ configured: false, publicKey: null });

		const response = await handler(request({ title: 'Hi', body: 'Hello' }));

		expect(response.status).toBe(503);
	});

	it('returns 400 for a body that is not valid JSON', async () => {
		vi.mocked(requireAuth0).mockResolvedValueOnce(null);
		vi.mocked(pushConfiguration).mockReturnValueOnce({ configured: true, publicKey: 'key' });

		const response = await handler(request(undefined, '{not json'));

		expect(response.status).toBe(400);
	});

	it('returns 400 when the title or body is missing', async () => {
		vi.mocked(requireAuth0).mockResolvedValueOnce(null);
		vi.mocked(pushConfiguration).mockReturnValueOnce({ configured: true, publicKey: 'key' });

		const response = await handler(request({ title: '', body: 'Hello' }));

		expect(response.status).toBe(400);
	});

	it('returns 409 when there is no active session', async () => {
		vi.mocked(requireAuth0).mockResolvedValueOnce(null);
		vi.mocked(pushConfiguration).mockReturnValueOnce({ configured: true, publicKey: 'key' });
		queueResult([]);

		const response = await handler(request({ title: 'Hi', body: 'Hello' }));

		expect(response.status).toBe(409);
	});

	it('returns queued:0 sent:0 without delivering when there are no recipients', async () => {
		vi.mocked(requireAuth0).mockResolvedValueOnce(null);
		vi.mocked(pushConfiguration).mockReturnValueOnce({ configured: true, publicKey: 'key' });
		queueResult([{ id: 'event-1', status: 'registration_open' }]);
		queueResult([]);

		const response = await handler(request({ title: 'Hi', body: 'Hello' }));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ queued: 0, sent: 0 });
		expect(db.insert).not.toHaveBeenCalled();
		expect(deliverPendingNotifications).not.toHaveBeenCalled();
	});

	it('queues one notification per recipient and delegates delivery', async () => {
		vi.mocked(requireAuth0).mockResolvedValueOnce(null);
		vi.mocked(pushConfiguration).mockReturnValueOnce({ configured: true, publicKey: 'key' });
		queueResult([{ id: 'event-1', status: 'service_started' }]);
		queueResult([{ visitId: 'visit-1' }, { visitId: 'visit-2' }]);
		queueResult(undefined);
		vi.mocked(deliverPendingNotifications).mockResolvedValueOnce({
			sent: 2,
			failed: 0,
			skipped: 0,
		});

		const response = await handler(request({ title: 'Hi', body: 'Hello' }));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ queued: 2, sent: 2 });
		expect(deliverPendingNotifications).toHaveBeenCalledWith(
			expect.objectContaining({ types: ['broadcast'], limit: 2 }),
		);
	});
});
