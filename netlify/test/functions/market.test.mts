import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));
vi.mock('../../lib/auth.mjs', () => ({ requirePermission: vi.fn() }));

import handler from '../../functions/market.mjs';
import { requirePermission } from '../../lib/auth.mjs';

function request(method: string, options: { path?: string; body?: unknown } = {}) {
	return new Request(`https://example.com/api/market${options.path ?? ''}`, {
		method,
		headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
		body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
	});
}

afterEach(() => {
	resetDbStub();
	vi.mocked(requirePermission).mockReset();
});

describe('market handler routing', () => {
	it('returns 405 for unsupported methods', async () => {
		const response = await handler(request('DELETE'));

		expect(response.status).toBe(405);
	});
});

describe('market handler GET (default overview is public)', () => {
	it('returns the overview without requiring auth', async () => {
		queueResult([]); // no active market event

		const response = await handler(request('GET'));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ event: null, questions: [], counts: {} });
		expect(requirePermission).not.toHaveBeenCalled();
	});
});

describe('market handler GET ?view=history (requires Auth0)', () => {
	it('returns the requirePermission response when unauthorized, without querying history', async () => {
		const unauthorized = Response.json({ error: 'Authorization required.' }, { status: 401 });

		vi.mocked(requirePermission).mockResolvedValueOnce(unauthorized);

		const response = await handler(request('GET', { path: '?view=history' }));

		expect(response).toBe(unauthorized);
		expect(db.select).not.toHaveBeenCalled();
	});

	it('returns history once authorized', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([]);

		const response = await handler(request('GET', { path: '?view=history' }));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual([]);
	});
});

describe('market handler PUT (requires Auth0)', () => {
	it('returns the requirePermission response when unauthorized, without parsing the body', async () => {
		const unauthorized = Response.json({ error: 'Authorization required.' }, { status: 401 });

		vi.mocked(requirePermission).mockResolvedValueOnce(unauthorized);

		const response = await handler(request('PUT', { body: { capacity: 10 } }));

		expect(response).toBe(unauthorized);
	});

	it('validates settings once authorized', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);

		const response = await handler(request('PUT', { body: { capacity: -1 } }));

		expect(response.status).toBe(400);
		expect(db.select).not.toHaveBeenCalled();
	});
});

describe('market handler POST (requires Auth0)', () => {
	it('returns the requirePermission response when unauthorized, without touching the database', async () => {
		const unauthorized = Response.json({ error: 'Authorization required.' }, { status: 401 });

		vi.mocked(requirePermission).mockResolvedValueOnce(unauthorized);

		const response = await handler(request('POST', { body: { action: 'run_lottery' } }));

		expect(response).toBe(unauthorized);
		expect(db.select).not.toHaveBeenCalled();
	});

	it('requires an existing market event once authorized', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([]); // no active market event

		const response = await handler(request('POST', { body: { action: 'run_lottery' } }));

		expect(response.status).toBe(409);
	});
});
