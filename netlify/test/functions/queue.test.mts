import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));
// History entries are an extra insert in each write's transaction; tested in visit-events.test.mts.
vi.mock('../../services/visit-events.mjs', () => ({
	recordVisitEvents: vi.fn(),
	listVisitEvents: vi.fn(),
	guestActor: { kind: 'guest' },
	systemActor: { kind: 'system' },
}));
vi.mock('../../lib/auth.mjs', () => ({ requirePermission: vi.fn() }));
vi.mock('../../services/pushNotifications.mjs', () => ({
	notificationsEnabled: vi.fn(() => false),
	deliverPendingNotifications: vi.fn(),
}));

import { requirePermission } from '../../lib/auth.mjs';
import handler from '../../routes/admin/queue.mjs';
import { recordVisitEvents } from '../../services/visit-events.mjs';

function request(method: string, body?: unknown) {
	return new Request('https://example.com/api/admin/queue', {
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
		registrationOpensAt: new Date('2026-08-08T16:00:00.000Z'),
		registrationClosesAt: new Date('2026-08-08T17:00:00.000Z'),
		capacity: 50,
		createdAt: new Date('2026-08-08T15:00:00.000Z'),
	};
}

afterEach(() => {
	resetDbStub();
	vi.mocked(requirePermission).mockReset();
	vi.mocked(recordVisitEvents).mockClear();
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

		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toEqual({ error: 'Authorization required.' });
		expect(response.headers.get('Cache-Control')).toBe('no-store');
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
		queueResult([activeEvent('lottery_pending')]);

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
		await expect(response.json()).resolves.toEqual({
			error: 'Please call between 1 and 50 guests at a time.',
		});
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('rejects an unknown action', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);

		const response = await handler(request('POST', { action: 'call_everyone' }));

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({ error: 'Invalid queue action.' });
	});

	it('rejects a body that is not JSON', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);

		const response = await handler(
			new Request('https://example.com/api/admin/queue', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: 'not json',
			}),
		);

		expect(response.status).toBe(400);
	});
});

describe('queue handler serve_and_call_next', () => {
	const visitId = '6f1c2a4e-3b5d-4c7e-9f80-1a2b3c4d5e6f';

	it('serves the guest and calls the next one in a single transaction', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([activeEvent()]);
		queueResult([{ id: visitId }]);
		queueResult([{ id: 'visit-2' }]);

		const response = await handler(request('POST', { action: 'serve_and_call_next', visitId }));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ served: visitId, called: ['visit-2'] });
		expect(db.transaction).toHaveBeenCalledTimes(1);
		// A standalone handler has no Auth0 middleware in front of it, so the worker is unnamed here.
		const worker = { kind: 'worker', id: null, name: null };

		expect(vi.mocked(recordVisitEvents).mock.calls.map(([, events]) => events)).toEqual([
			[{ visitId, kind: 'served', toStatus: 'served', actor: worker }],
			[{ visitId: 'visit-2', kind: 'called', toStatus: 'called', actor: worker }],
		]);
	});

	it('still serves the guest when nobody is left to call', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([activeEvent()]);
		queueResult([{ id: visitId }]);
		queueResult([]);

		const response = await handler(request('POST', { action: 'serve_and_call_next', visitId }));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ served: visitId, called: [] });
	});

	it('calls nobody when the guest was already finished by someone else', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([activeEvent()]);
		queueResult([]);

		const response = await handler(request('POST', { action: 'serve_and_call_next', visitId }));

		expect(response.status).toBe(409);
		expect(db.update).toHaveBeenCalledTimes(1);
	});

	it('rejects a visit id that is not a UUID', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);

		const response = await handler(
			request('POST', { action: 'serve_and_call_next', visitId: 'visit-1' }),
		);

		expect(response.status).toBe(400);
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('rejects serving before service starts', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([activeEvent('ended')]);

		const response = await handler(request('POST', { action: 'serve_and_call_next', visitId }));

		expect(response.status).toBe(409);
		expect(db.transaction).not.toHaveBeenCalled();
	});
});
