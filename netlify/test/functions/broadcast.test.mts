import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.js', () => ({ db }));
vi.mock('../../lib/auth.mjs', () => ({ requirePermission: vi.fn() }));
vi.mock('../../services/pushNotifications.mjs', () => ({
	deliverPendingNotifications: vi.fn(),
	pushConfiguration: vi.fn(),
}));

import handler from '../../functions/broadcast.mjs';
import { requirePermission } from '../../lib/auth.mjs';
import {
	deliverPendingNotifications,
	pushConfiguration,
} from '../../services/pushNotifications.mjs';

function request(body?: unknown, rawBody?: string) {
	return new Request('https://example.com/api/broadcast', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: rawBody ?? (body !== undefined ? JSON.stringify(body) : undefined),
	});
}

afterEach(() => {
	resetDbStub();
	vi.mocked(requirePermission).mockReset();
	vi.mocked(pushConfiguration).mockReset();
	vi.mocked(deliverPendingNotifications).mockReset();
});

describe('broadcast handler', () => {
	it('returns 405 for non-POST requests', async () => {
		const response = await handler(new Request('https://example.com/api/broadcast'));

		expect(response.status).toBe(405);
		expect(requirePermission).not.toHaveBeenCalled();
	});

	it('returns the requirePermission response when unauthorized', async () => {
		const unauthorized = Response.json({ error: 'Authorization required.' }, { status: 401 });
		vi.mocked(requirePermission).mockResolvedValueOnce(unauthorized);

		const response = await handler(request({ title: 'Hi', body: 'Hello' }));

		expect(response).toBe(unauthorized);
	});

	it('returns 503 when push notifications are not configured', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		vi.mocked(pushConfiguration).mockReturnValueOnce({ configured: false, publicKey: null });

		const response = await handler(request({ title: 'Hi', body: 'Hello' }));

		expect(response.status).toBe(503);
	});

	it('returns 400 for a body that is not valid JSON', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		vi.mocked(pushConfiguration).mockReturnValueOnce({ configured: true, publicKey: 'key' });

		const response = await handler(request(undefined, '{not json'));

		expect(response.status).toBe(400);
	});

	it('returns 400 when the title or body is missing', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		vi.mocked(pushConfiguration).mockReturnValueOnce({ configured: true, publicKey: 'key' });

		const response = await handler(request({ title: '', body: 'Hello' }));

		expect(response.status).toBe(400);
	});

	it('returns 409 when there is no active session', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		vi.mocked(pushConfiguration).mockReturnValueOnce({ configured: true, publicKey: 'key' });
		queueResult([]);

		const response = await handler(request({ title: 'Hi', body: 'Hello' }));

		expect(response.status).toBe(409);
	});

	it('returns queued:0 sent:0 without delivering when there are no recipients', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
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
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
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
