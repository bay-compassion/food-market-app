import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));
vi.mock('../../lib/auth.mjs', () => ({ requirePermission: vi.fn() }));

import { requirePermission } from '../../lib/auth.mjs';
import handler from '../../routes/admin/guests.mjs';

function request(method: string, options: { path?: string; body?: unknown } = {}) {
	return new Request(`https://example.com/api/admin/guests${options.path ?? ''}`, {
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

		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toEqual({ error: 'Authorization required.' });
		expect(response.headers.get('Cache-Control')).toBe('no-store');
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

		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toEqual({ error: 'Authorization required.' });
		expect(response.headers.get('Cache-Control')).toBe('no-store');
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

describe('guests handler POST (admin only)', () => {
	it('requires Auth0 before inspecting the submission', async () => {
		const unauthorized = Response.json({ error: 'Authorization required.' }, { status: 401 });

		vi.mocked(requirePermission).mockResolvedValueOnce(unauthorized);

		const response = await handler(
			request('POST', {
				body: {
					firstName: 'Ari',
					lastName: 'Guest',
					ageRange: '18-29',
					householdSize: 2,
					childrenCount: 0,
					seniorsCount: 0,
					phone: '555-123-4567',
					locale: 'en',
					source: 'admin',
					marketEventId: 'event-1',
				},
			}),
		);

		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toEqual({ error: 'Authorization required.' });
		expect(response.headers.get('Cache-Control')).toBe('no-store');
		expect(db.select).not.toHaveBeenCalled();
	});

	it('rejects self-service submissions once authorized', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);

		const response = await handler(
			request('POST', {
				body: {
					firstName: 'Ari',
					lastName: 'Guest',
					ageRange: '18-29',
					householdSize: 2,
					childrenCount: 0,
					seniorsCount: 0,
					phone: '555-123-4567',
					locale: 'en',
					deviceToken: null,
					marketEventId: 'event-1',
				},
			}),
		);

		expect(response.status).toBe(400);
		expect(db.select).not.toHaveBeenCalled();
	});
});
