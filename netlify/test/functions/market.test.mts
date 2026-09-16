import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));
vi.mock('../../lib/auth.mjs', () => ({ requirePermission: vi.fn() }));
vi.mock('../../services/notificationDispatch.mjs', () => ({
	requestNotificationDispatch: vi.fn(),
}));
vi.mock('../../services/sessionTimers.mjs', () => ({
	scheduleSessionTimers: vi.fn(),
	scheduleSessionTimersQuietly: vi.fn(),
	upcomingSessionTimers: ['registration_close', 'auto_close'],
}));

import { requirePermission } from '../../lib/auth.mjs';
import handler from '../../routes/admin/market.mjs';
import publicHandler from '../../routes/market/market.mjs';

function request(method: string, options: { path?: string; body?: unknown } = {}) {
	return new Request(`https://example.com/api/admin/market${options.path ?? ''}`, {
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

		const response = await publicHandler(new Request('https://example.com/api/market'));

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

		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toEqual({ error: 'Authorization required.' });
		expect(response.headers.get('Cache-Control')).toBe('no-store');
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

describe('market handler PUT', () => {
	it('is no longer offered: sessions are created from the schedule', async () => {
		const response = await handler(request('PUT', { body: { capacity: 10 } }));

		expect(response.status).toBe(405);
		expect(db.select).not.toHaveBeenCalled();
	});
});

describe('market handler POST (requires Auth0)', () => {
	it('returns the requirePermission response when unauthorized, without touching the database', async () => {
		const unauthorized = Response.json({ error: 'Authorization required.' }, { status: 401 });

		vi.mocked(requirePermission).mockResolvedValueOnce(unauthorized);

		const response = await handler(request('POST', { body: { action: 'run_lottery' } }));

		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toEqual({ error: 'Authorization required.' });
		expect(response.headers.get('Cache-Control')).toBe('no-store');
		expect(db.select).not.toHaveBeenCalled();
	});

	it('requires an existing market event once authorized', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([]); // no active market event

		const response = await handler(request('POST', { body: { action: 'run_lottery' } }));

		expect(response.status).toBe(409);
	});
});
