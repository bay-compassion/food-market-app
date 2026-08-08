import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.js';

vi.mock('../../../db/index.js', () => ({ db }));

import handler from '../../functions/visit.js';

const validToken = 'a'.repeat(40);

function request(method: string, options: { token?: string; body?: unknown } = {}) {
	const headers = new Headers();
	if (options.token) {
		headers.set('Authorization', `Bearer ${options.token}`);
	}
	if (options.body !== undefined) {
		headers.set('Content-Type', 'application/json');
	}

	return new Request('https://example.com/api/visit', {
		method,
		headers,
		body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
	});
}

afterEach(() => {
	resetDbStub();
});

describe('visit handler auth', () => {
	it('returns 401 with no Authorization header', async () => {
		const response = await handler(request('GET'));

		expect(response.status).toBe(401);
	});

	it('returns 401 for a token that is too short to be real', async () => {
		const response = await handler(request('GET', { token: 'short' }));

		expect(response.status).toBe(401);
	});

	it('returns 401 when no visit matches the token', async () => {
		queueResult([]);

		const response = await handler(request('GET', { token: validToken }));

		expect(response.status).toBe(401);
	});
});

describe('visit handler GET', () => {
	it('returns the visit when its session is still active', async () => {
		const visit = {
			id: 'visit-1',
			status: 'registered',
			marketEventId: 'event-1',
			queuePosition: null,
			calledAt: null,
			sessionStatus: 'registration_open',
		};
		queueResult([visit]);

		const response = await handler(request('GET', { token: validToken }));

		expect(response.status).toBe(200);
		// A registered guest is still pre-lottery, so there is no queue to be ahead of.
		await expect(response.json()).resolves.toEqual({ ...visit, aheadOfYou: null });
	});

	it('reports how many waiting guests are ahead of a waiting visit', async () => {
		const visit = {
			id: 'visit-1',
			status: 'waiting',
			marketEventId: 'event-1',
			queuePosition: 4,
			calledAt: null,
			sessionStatus: 'service_started',
		};
		queueResult([visit]);
		queueResult([{ count: 3 }]);

		const response = await handler(request('GET', { token: validToken }));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ ...visit, aheadOfYou: 3 });
	});

	it('reports no queue position once the guest has been called', async () => {
		const visit = {
			id: 'visit-1',
			status: 'called',
			marketEventId: 'event-1',
			queuePosition: 4,
			calledAt: '2026-08-08T18:00:00.000Z',
			sessionStatus: 'service_started',
		};
		queueResult([visit]);

		const response = await handler(request('GET', { token: validToken }));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ ...visit, aheadOfYou: null });
	});

	it('returns 410 when the visit belongs to an ended session', async () => {
		queueResult([
			{ id: 'visit-1', status: 'served', marketEventId: 'event-1', sessionStatus: 'ended' },
		]);

		const response = await handler(request('GET', { token: validToken }));

		expect(response.status).toBe(410);
	});
});

describe('visit handler PATCH', () => {
	function activeVisit() {
		return {
			id: 'visit-1',
			status: 'waiting',
			marketEventId: 'event-1',
			sessionStatus: 'service_started',
		};
	}

	it('cancels a visit in a cancellable status', async () => {
		queueResult([activeVisit()]);
		queueResult([{ id: 'visit-1', status: 'cancelled' }]);

		const response = await handler(
			request('PATCH', { token: validToken, body: { action: 'cancel' } }),
		);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ id: 'visit-1', status: 'cancelled' });
	});

	it('returns 409 when the visit is no longer in a cancellable status', async () => {
		queueResult([activeVisit()]);
		queueResult([]);

		const response = await handler(
			request('PATCH', { token: validToken, body: { action: 'cancel' } }),
		);

		expect(response.status).toBe(409);
	});

	it('returns 409 without attempting a cancel when the session has ended', async () => {
		queueResult([
			{ id: 'visit-1', status: 'waiting', marketEventId: 'event-1', sessionStatus: 'ended' },
		]);

		const response = await handler(
			request('PATCH', { token: validToken, body: { action: 'cancel' } }),
		);

		expect(response.status).toBe(409);
		expect(db.update).not.toHaveBeenCalled();
	});

	it('returns 400 for a body that is not valid JSON', async () => {
		queueResult([activeVisit()]);
		const badRequest = new Request('https://example.com/api/visit', {
			method: 'PATCH',
			headers: { Authorization: `Bearer ${validToken}`, 'Content-Type': 'application/json' },
			body: '{not json',
		});

		const response = await handler(badRequest);

		expect(response.status).toBe(400);
	});

	it('returns 400 for an unrecognized action', async () => {
		queueResult([activeVisit()]);

		const response = await handler(
			request('PATCH', { token: validToken, body: { action: 'delete' } }),
		);

		expect(response.status).toBe(400);
	});
});

describe('visit handler method routing', () => {
	it('returns 405 for unsupported methods', async () => {
		queueResult([
			{
				id: 'visit-1',
				status: 'waiting',
				marketEventId: 'event-1',
				sessionStatus: 'service_started',
			},
		]);

		const response = await handler(request('DELETE', { token: validToken }));

		expect(response.status).toBe(405);
	});
});
