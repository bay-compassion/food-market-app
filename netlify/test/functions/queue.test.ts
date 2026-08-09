import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.js';

vi.mock('../../../db/index.js', () => ({ db }));
vi.mock('../../lib/auth.js', () => ({ requirePermission: vi.fn() }));
vi.mock('../../services/pushNotifications.js', () => ({
	notificationsEnabled: vi.fn(() => false),
	deliverPendingNotifications: vi.fn(),
}));

import handler from '../../functions/queue.js';
import { requirePermission } from '../../lib/auth.js';

function request(method: string, body?: unknown) {
	return new Request('https://example.com/api/queue', {
		method,
		headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}

/** The single active event `getCurrentEvent` resolves before the queue is touched. */
function activeEvent(status = 'service_started') {
	return {
		id: 'event-1',
		status,
		sessionMode: 'scheduled',
		registrationOpensAt: new Date('2026-08-08T16:00:00.000Z'),
		registrationClosesAt: new Date('2026-08-08T17:00:00.000Z'),
		capacity: 50,
		createdAt: new Date('2026-08-08T15:00:00.000Z'),
	};
}

afterEach(() => {
	resetDbStub();
	vi.mocked(requirePermission).mockReset();
});

describe('queue handler routing', () => {
	it('returns 405 for unsupported methods', async () => {
		const response = await handler(request('GET'));

		expect(response.status).toBe(405);
	});

	it('returns the requirePermission response when unauthorized, without touching the database', async () => {
		const unauthorized = Response.json({ error: 'Authorization required.' }, { status: 401 });
		vi.mocked(requirePermission).mockResolvedValueOnce(unauthorized);

		const response = await handler(request('POST', { action: 'call_next', count: 2 }));

		expect(response).toBe(unauthorized);
		expect(db.transaction).not.toHaveBeenCalled();
	});
});

describe('queue handler call_next', () => {
	it('calls the requested number of waiting guests', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([activeEvent()]);
		queueResult([{ id: 'visit-1' }, { id: 'visit-2' }]);

		const response = await handler(request('POST', { action: 'call_next', count: 2 }));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ called: ['visit-1', 'visit-2'] });
	});

	it('defaults to calling a single guest', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([activeEvent()]);
		queueResult([{ id: 'visit-1' }]);

		const response = await handler(request('POST', { action: 'call_next' }));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ called: ['visit-1'] });
	});

	it('reports an empty queue rather than failing', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([activeEvent()]);
		queueResult([]);

		const response = await handler(request('POST', { action: 'call_next', count: 5 }));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ called: [] });
	});

	it('rejects calling guests before service starts', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([activeEvent('registration_closed')]);

		const response = await handler(request('POST', { action: 'call_next', count: 1 }));

		expect(response.status).toBe(409);
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('rejects when no session exists', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([]);

		const response = await handler(request('POST', { action: 'call_next', count: 1 }));

		expect(response.status).toBe(409);
	});

	it.each([0, -1, 51, 1.5, 'two'])('rejects an invalid batch size of %s', async (count) => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);

		const response = await handler(request('POST', { action: 'call_next', count }));

		expect(response.status).toBe(400);
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('rejects an unknown action', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);

		const response = await handler(request('POST', { action: 'call_everyone' }));

		expect(response.status).toBe(400);
	});

	it('rejects a body that is not JSON', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);

		const response = await handler(
			new Request('https://example.com/api/queue', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: 'not json',
			}),
		);

		expect(response.status).toBe(400);
	});
});
