import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.js', () => ({ db }));
vi.mock('../../lib/auth.mjs', () => ({ requirePermission: vi.fn() }));

import handler from '../../functions/guests.mjs';
import { requirePermission } from '../../lib/auth.mjs';

function request(method: string, options: { path?: string; body?: unknown } = {}) {
	return new Request(`https://example.com/api/guests${options.path ?? ''}`, {
		method,
		headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
		body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
	});
}

afterEach(() => {
	resetDbStub();
	vi.mocked(requirePermission).mockReset();
});

describe('guests handler routing', () => {
	it('returns 405 for unsupported methods', async () => {
		const response = await handler(request('DELETE'));

		expect(response.status).toBe(405);
	});
});

describe('guests handler GET (admin: requires Auth0)', () => {
	it('returns the requirePermission response when unauthorized, without querying guests', async () => {
		const unauthorized = Response.json({ error: 'Authorization required.' }, { status: 401 });
		vi.mocked(requirePermission).mockResolvedValueOnce(unauthorized);

		const response = await handler(request('GET'));

		expect(response).toBe(unauthorized);
		expect(db.select).not.toHaveBeenCalled();
	});

	it('lists guests once authorized', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([]);

		const response = await handler(request('GET', { path: '?scope=all' }));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual([]);
	});
});

describe('guests handler PATCH (admin: requires Auth0)', () => {
	it('returns the requirePermission response when unauthorized, without touching the database', async () => {
		const unauthorized = Response.json({ error: 'Authorization required.' }, { status: 401 });
		vi.mocked(requirePermission).mockResolvedValueOnce(unauthorized);

		const response = await handler(request('PATCH', { body: { id: 'visit-1', command: 'serve' } }));

		expect(response).toBe(unauthorized);
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('validates the body once authorized', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);

		const response = await handler(request('PATCH', { body: { id: 'visit-1' } }));

		expect(response.status).toBe(400);
	});

	it('rejects a status string now that transitions are expressed as commands', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);

		const response = await handler(request('PATCH', { body: { id: 'visit-1', status: 'served' } }));

		expect(response.status).toBe(400);
	});

	it('applies a command that is legal from the current status', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([{ status: 'called' }]); // current visit status
		queueResult([{ id: 'visit-1', status: 'served' }]); // the update

		const response = await handler(request('PATCH', { body: { id: 'visit-1', command: 'serve' } }));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ id: 'visit-1', status: 'served' });
	});

	it('rejects a command that is illegal from the current status', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([{ status: 'waiting' }]); // you cannot serve someone who was never called

		const response = await handler(request('PATCH', { body: { id: 'visit-1', command: 'serve' } }));

		expect(response.status).toBe(409);
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('returns 404 when the visit does not exist', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([]);

		const response = await handler(request('PATCH', { body: { id: 'missing', command: 'call' } }));

		expect(response.status).toBe(404);
	});
});

describe('guests handler POST (self-service registration is intentionally public)', () => {
	it('does not check permissions for a self-service submission with no Authorization header', async () => {
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
		// No permission check happens on the public self-service path.
		expect(response.status).toBe(409);
		expect(requirePermission).not.toHaveBeenCalled();
	});

	it('requires Auth0 for an admin-source submission', async () => {
		const unauthorized = Response.json({ error: 'Authorization required.' }, { status: 401 });
		vi.mocked(requirePermission).mockResolvedValueOnce(unauthorized);

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
		expect(requirePermission).not.toHaveBeenCalled();
		expect(db.select).not.toHaveBeenCalled();
	});
});
