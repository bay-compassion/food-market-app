import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));
const blobs = vi.hoisted(() => ({
	entry: null as { data: unknown; etag: string } | null,
	revision: 0,
}));

vi.mock('@netlify/blobs', () => ({
	getDeployStore: vi.fn(() => ({
		getWithMetadata: vi.fn(async () => blobs.entry),
		setJSON: vi.fn(
			async (
				_key: string,
				data: unknown,
				condition: { onlyIfNew?: boolean; onlyIfMatch?: string },
			) => {
				if (
					condition.onlyIfNew ? blobs.entry !== null : blobs.entry?.etag !== condition.onlyIfMatch
				) {
					return { modified: false };
				}
				blobs.revision += 1;
				blobs.entry = { data, etag: String(blobs.revision) };

				return { modified: true, etag: blobs.entry.etag };
			},
		),
	})),
}));
vi.mock('../../lib/auth.mjs', () => ({ requirePermission: vi.fn() }));
vi.mock('../../services/notificationDispatch.mjs', () => ({
	requestNotificationDispatch: vi.fn(),
}));
vi.mock('../../services/sessionTimers.mjs', () => ({
	scheduleSessionTimers: vi.fn(),
	scheduleSessionTimersQuietly: vi.fn(),
	upcomingSessionTimers: ['registration_close', 'auto_close'],
}));

import { getDeployStore } from '@netlify/blobs';

import { requirePermission } from '../../lib/auth.mjs';
import handler from '../../routes/admin/market.mjs';
import publicHandler from '../../routes/market/market.mjs';
import { baseEvent } from '../marketEventFixture.mjs';

function request(method: string, options: { path?: string; body?: unknown } = {}) {
	return new Request(`https://example.com/api/admin/market${options.path ?? ''}`, {
		method,
		headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
		body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
	});
}

afterEach(() => {
	resetDbStub();
	blobs.entry = null;
	blobs.revision = 0;
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

describe('blob-backed public market overview', () => {
	it('serves a fresh snapshot without database queries and preserves transport policy', async () => {
		queueResult([]);
		await publicHandler(new Request('https://example.com/api/market'));
		resetDbStub();

		const response = await publicHandler(new Request('https://example.com/api/market'));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ event: null, questions: [], counts: {} });
		expect(response.headers.get('Cache-Control')).toBe('no-store');
		expect(db.select).not.toHaveBeenCalled();
		expect(getDeployStore).toHaveBeenCalledWith({ name: 'market-polling', consistency: 'strong' });
	});

	it('still applies overdue registration transitions on a cache miss', async () => {
		vi.stubEnv('NOTIFICATIONS_ENABLED', 'false');
		const event = baseEvent({
			status: 'registration_open',
			registrationClosesAt: new Date(Date.now() - 1_000),
		});

		queueResult([event]);
		queueResult([{ ...event, status: 'registration_closed' }]);
		queueResult([]);
		queueResult([]);

		const response = await publicHandler(new Request('https://example.com/api/market'));

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ event: { status: 'registration_closed' } });
		expect(db.update).toHaveBeenCalled();
		vi.unstubAllEnvs();
	});
});

describe('live staff market overview', () => {
	it('requires queue permission without reading the database when rejected', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(
			Response.json({ error: 'Forbidden.' }, { status: 403 }),
		);

		const response = await handler(new Request('https://example.com/api/admin/market/overview'));

		expect(response.status).toBe(403);
		expect(requirePermission).toHaveBeenCalledWith(expect.any(Request), 'run:queue', undefined);
		expect(db.select).not.toHaveBeenCalled();
	});

	it('reads the database on every request independently of the guest cache', async () => {
		vi.mocked(requirePermission).mockResolvedValue(null);
		queueResult([]);
		queueResult([]);

		const first = await handler(new Request('https://example.com/api/admin/market/overview'));
		const second = await handler(new Request('https://example.com/api/admin/market/overview'));

		await expect(first.json()).resolves.toEqual({ event: null, questions: [], counts: {} });
		await expect(second.json()).resolves.toEqual({ event: null, questions: [], counts: {} });
		expect(db.select).toHaveBeenCalledTimes(2);
		expect(second.headers.get('Cache-Control')).toBe('no-store');
		expect(blobs.entry).toBeNull();
	});
});
