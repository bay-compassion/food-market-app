import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));
vi.mock('../../lib/auth.mjs', () => ({ requirePermission: vi.fn(), verifyAuth0Token: vi.fn() }));

import handler, { config } from '../../functions/api.mjs';
import { requirePermission, verifyAuth0Token } from '../../lib/auth.mjs';

const paths = [
	'/api/admin/market',
	'/api/market',
	'/api/admin/queue',
	'/api/admin/guests',
	'/api/visit',
	'/api/push-subscription',
	'/api/sms-subscription',
	'/api/notification-status',
	'/api/admin/broadcast',
	'/api/admin/reports',
	'/api/admin/demo-data',
];

beforeEach(() => {
	vi.stubEnv('NOTIFICATIONS_ENABLED', 'false');
	vi.mocked(verifyAuth0Token).mockRejectedValue(new Error('Missing token'));
	vi.mocked(requirePermission).mockImplementation(async () =>
		Response.json({ error: 'Authorization required.' }, { status: 401 }),
	);
});

afterEach(() => {
	resetDbStub();
	vi.mocked(requirePermission).mockReset();
	vi.mocked(verifyAuth0Token).mockReset();
	vi.unstubAllEnvs();
});

describe('consolidated API routing', () => {
	it('registers every canonical API path on the Netlify function', () => {
		expect(config.path).toEqual([
			'/api/admin',
			'/api/admin/*',
			...paths.filter((path) => !path.startsWith('/api/admin/')),
		]);
	});

	it.each(paths)('rejects HEAD before dispatching %s', async (path) => {
		const response = await handler(new Request(`https://example.com${path}`, { method: 'HEAD' }));

		expect(response.status).toBe(405);
		await expect(response.text()).resolves.toBe('');
		expect(response.headers.get('Cache-Control')).toBe('no-store');
		expect(db.select).not.toHaveBeenCalled();
		expect(requirePermission).not.toHaveBeenCalled();
	});

	it('returns JSON for an unknown internal route', async () => {
		const response = await handler(new Request('https://example.com/api/not-configured'));

		expect(response.status).toBe(404);
		await expect(response.json()).resolves.toEqual({ error: 'Not found.' });
	});

	it.each([
		['/api/market', 'GET', 200, { event: null, questions: [], counts: {} }],
		['/api/admin/queue', 'POST', 401, { error: 'Authorization required.' }],
		['/api/admin/guests', 'GET', 401, { error: 'Authorization required.' }],
		['/api/visit', 'GET', 401, { error: 'Visit access could not be verified.' }],
		['/api/push-subscription', 'GET', 200, { configured: false, publicKey: null }],
		['/api/sms-subscription', 'GET', 200, { configured: false }],
		['/api/notification-status', 'GET', 401, { error: 'Device access could not be verified.' }],
		['/api/admin/broadcast', 'POST', 401, { error: 'Authorization required.' }],
		['/api/admin/reports', 'GET', 401, { error: 'Authorization required.' }],
		['/api/admin/demo-data', 'GET', 401, { error: 'Authorization required.' }],
	] as const)('dispatches %s %s through the mounted router', async (path, method, status, body) => {
		queueResult([]);
		const request = new Request(
			`https://example.com${path}`,
			method === 'POST' ? { method, body: '{}' } : { method },
		);

		const response = await handler(request);

		expect(response.status).toBe(status);
		await expect(response.json()).resolves.toEqual(body);
	});

	it.each([
		['/api/market', 405, 'Method not allowed'],
		['/api/admin/demo-data', 401, 'Authorization required.'],
		['/api/visit', 401, 'Visit access could not be verified.'],
		['/api/push-subscription', 503, 'Push notifications are not configured.'],
		['/api/sms-subscription', 503, 'SMS notifications are not configured.'],
	] as const)('preserves the gates before the %s method fallback', async (path, status, error) => {
		const response = await handler(
			new Request(`https://example.com${path}`, { method: 'OPTIONS' }),
		);

		expect(response.status).toBe(status);
		await expect(response.json()).resolves.toEqual({ error });
		expect(db.select).not.toHaveBeenCalled();
	});

	it.each(['/api/guest-information', '/api/lottery-registration'])(
		'does not expose rate-limited public writes through the main API: %s',
		async (path) => {
			const response = await handler(
				new Request(`https://example.com${path}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: '{}',
				}),
			);

			expect(response.status).toBe(404);
			expect(db.select).not.toHaveBeenCalled();
			expect(db.insert).not.toHaveBeenCalled();
		},
	);

	it('keeps polling outside the public-write rate limit', () => {
		expect(config.rateLimit).toBeUndefined();
	});
});
