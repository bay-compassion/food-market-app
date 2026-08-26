import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));
vi.mock('../../lib/auth.mjs', () => ({ requirePermission: vi.fn() }));
vi.mock('../../services/pushNotifications.mjs', () => ({ pushConfiguration: vi.fn() }));
vi.mock('../../services/smsNotifications.mjs', () => ({ smsConfiguration: vi.fn() }));
vi.mock('../../services/notifications.mjs', () => ({
	queueNotification: vi.fn(),
	deliverQueuedNotifications: vi.fn(),
}));

import handler from '../../functions/broadcast.mjs';
import { requirePermission } from '../../lib/auth.mjs';
import { deliverQueuedNotifications, queueNotification } from '../../services/notifications.mjs';
import { pushConfiguration } from '../../services/pushNotifications.mjs';
import { smsConfiguration } from '../../services/smsNotifications.mjs';

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
	vi.mocked(smsConfiguration).mockReset();
	vi.mocked(queueNotification).mockReset();
	vi.mocked(deliverQueuedNotifications).mockReset();
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

	it('returns 503 when neither push nor SMS notifications are configured', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		vi.mocked(pushConfiguration).mockReturnValueOnce({ configured: false, publicKey: null });
		vi.mocked(smsConfiguration).mockReturnValueOnce({ configured: false });

		const response = await handler(request({ title: 'Hi', body: 'Hello' }));

		expect(response.status).toBe(503);
	});

	it('proceeds when only SMS is configured', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		vi.mocked(pushConfiguration).mockReturnValueOnce({ configured: false, publicKey: null });
		vi.mocked(smsConfiguration).mockReturnValueOnce({ configured: true });
		queueResult([]);

		const response = await handler(request({ title: 'Hi', body: 'Hello' }));

		expect(response.status).toBe(409);
	});

	it('returns 400 for a body that is not valid JSON', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		vi.mocked(pushConfiguration).mockReturnValueOnce({ configured: true, publicKey: 'key' });
		vi.mocked(smsConfiguration).mockReturnValueOnce({ configured: false });

		const response = await handler(request(undefined, '{not json'));

		expect(response.status).toBe(400);
	});

	it('returns 400 when the title or body is missing', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		vi.mocked(pushConfiguration).mockReturnValueOnce({ configured: true, publicKey: 'key' });
		vi.mocked(smsConfiguration).mockReturnValueOnce({ configured: false });

		const response = await handler(request({ title: '', body: 'Hello' }));

		expect(response.status).toBe(400);
	});

	it('returns 409 when there is no active session', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		vi.mocked(pushConfiguration).mockReturnValueOnce({ configured: true, publicKey: 'key' });
		vi.mocked(smsConfiguration).mockReturnValueOnce({ configured: false });
		queueResult([]);

		const response = await handler(request({ title: 'Hi', body: 'Hello' }));

		expect(response.status).toBe(409);
	});

	it('returns queued:0 sent:0 without delivering when there are no recipients', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		vi.mocked(pushConfiguration).mockReturnValueOnce({ configured: true, publicKey: 'key' });
		vi.mocked(smsConfiguration).mockReturnValueOnce({ configured: false });
		queueResult([{ id: 'event-1', status: 'registration_open' }]);
		queueResult([]);

		const response = await handler(request({ title: 'Hi', body: 'Hello' }));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ queued: 0, sent: 0 });
		expect(queueNotification).not.toHaveBeenCalled();
		expect(deliverQueuedNotifications).not.toHaveBeenCalled();
	});

	it('queues one notification per recipient and delegates delivery', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		vi.mocked(pushConfiguration).mockReturnValueOnce({ configured: true, publicKey: 'key' });
		vi.mocked(smsConfiguration).mockReturnValueOnce({ configured: false });
		queueResult([{ id: 'event-1', status: 'service_started' }]);
		queueResult([{ visitId: 'visit-1' }, { visitId: 'visit-2' }]);
		vi.mocked(deliverQueuedNotifications).mockResolvedValueOnce({
			sent: 2,
			failed: 0,
			skipped: 0,
		});

		const response = await handler(request({ title: 'Hi', body: 'Hello' }));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ queued: 2, sent: 2 });
		expect(queueNotification).toHaveBeenCalledWith(
			db,
			['visit-1', 'visit-2'],
			'broadcast',
			expect.stringMatching(/^broadcast:/),
			{ title: 'Hi', body: 'Hello' },
		);
		expect(deliverQueuedNotifications).toHaveBeenCalledWith(
			expect.objectContaining({ types: ['broadcast'], limit: 2 }),
		);
	});
});
