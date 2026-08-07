import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.js';

vi.mock('../../../db/index.js', () => ({ db }));
vi.mock('../../lib/auth.js', () => ({ requireAuth0: vi.fn() }));

import handler from '../../functions/guests.js';
import { requireAuth0 } from '../../lib/auth.js';

function request(method: string, options: { path?: string; body?: unknown } = {}) {
	return new Request(`https://example.com/api/guests${options.path ?? ''}`, {
		method,
		headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
		body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
	});
}

afterEach(() => {
	resetDbStub();
	vi.mocked(requireAuth0).mockReset();
});

describe('guests handler routing', () => {
	it('returns 405 for unsupported methods', async () => {
		const response = await handler(request('DELETE'));

		expect(response.status).toBe(405);
	});
});

describe('guests handler GET (admin: requires Auth0)', () => {
	it('returns the requireAuth0 response when unauthorized, without querying guests', async () => {
		const unauthorized = Response.json({ error: 'Authorization required.' }, { status: 401 });
		vi.mocked(requireAuth0).mockResolvedValueOnce(unauthorized);

		const response = await handler(request('GET'));

		expect(response).toBe(unauthorized);
		expect(db.select).not.toHaveBeenCalled();
	});

	it('lists guests once authorized', async () => {
		vi.mocked(requireAuth0).mockResolvedValueOnce(null);
		queueResult([]);

		const response = await handler(request('GET', { path: '?scope=all' }));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual([]);
	});
});

describe('guests handler PATCH (admin: requires Auth0)', () => {
	it('returns the requireAuth0 response when unauthorized, without touching the database', async () => {
		const unauthorized = Response.json({ error: 'Authorization required.' }, { status: 401 });
		vi.mocked(requireAuth0).mockResolvedValueOnce(unauthorized);

		const response = await handler(request('PATCH', { body: { id: 'visit-1', status: 'served' } }));

		expect(response).toBe(unauthorized);
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('validates the body once authorized', async () => {
		vi.mocked(requireAuth0).mockResolvedValueOnce(null);

		const response = await handler(request('PATCH', { body: { id: 'visit-1' } }));

		expect(response.status).toBe(400);
	});
});

describe('guests handler POST (self-service registration is intentionally public)', () => {
	it('does not call requireAuth0 for a self-service submission with no Authorization header', async () => {
		queueResult([]); // marketEvents lookup for the submitted marketEventId — none found

		const response = await handler(
			request('POST', {
				body: {
					firstName: 'Ari',
					lastName: 'Guest',
					age: 30,
					householdSize: 2,
					phone: '555-123-4567',
					locale: 'en',
					pin: '1234',
					marketEventId: 'event-1',
				},
			}),
		);

		// The submitted event doesn't exist in this stub, so registration is correctly rejected —
		// the point of this test is that it's rejected with a business-logic 409, not a 401, and
		// requireAuth0 is never invoked for the public self-service path.
		expect(response.status).toBe(409);
		expect(requireAuth0).not.toHaveBeenCalled();
	});

	it('requires Auth0 for an admin-source submission', async () => {
		const unauthorized = Response.json({ error: 'Authorization required.' }, { status: 401 });
		vi.mocked(requireAuth0).mockResolvedValueOnce(unauthorized);

		const response = await handler(
			request('POST', {
				body: {
					firstName: 'Ari',
					lastName: 'Guest',
					age: 30,
					householdSize: 2,
					phone: '555-123-4567',
					locale: 'en',
					source: 'admin',
					marketEventId: 'event-1',
				},
			}),
		);

		expect(response).toBe(unauthorized);
		expect(db.select).not.toHaveBeenCalled();
	});

	it('returns 400 for an invalid submission before any auth or database check', async () => {
		const response = await handler(request('POST', { body: { firstName: '' } }));

		expect(response.status).toBe(400);
		expect(requireAuth0).not.toHaveBeenCalled();
		expect(db.select).not.toHaveBeenCalled();
	});
});
