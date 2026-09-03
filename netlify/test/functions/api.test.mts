import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));
vi.mock('../../lib/auth.mjs', () => ({ requirePermission: vi.fn() }));

import handler, { config } from '../../functions/api.mjs';
import { requirePermission } from '../../lib/auth.mjs';

const paths = [
	'/api/market',
	'/api/queue',
	'/api/guests',
	'/api/lottery-registration',
	'/api/guest-information',
	'/api/visit',
	'/api/push-subscription',
	'/api/sms-subscription',
	'/api/notification-status',
	'/api/broadcast',
	'/api/reports',
	'/api/demo-data',
];

beforeEach(() => {
	vi.stubEnv('NOTIFICATIONS_ENABLED', 'false');
	vi.mocked(requirePermission).mockImplementation(async () =>
		Response.json({ error: 'Authorization required.' }, { status: 401 }),
	);
});

afterEach(() => {
	resetDbStub();
	vi.mocked(requirePermission).mockReset();
	vi.unstubAllEnvs();
});

describe('consolidated API routing', () => {
	it('registers every canonical API path on the Netlify function', () => {
		expect(config.path).toEqual(paths);
	});

	it.each(paths)('rejects HEAD before dispatching %s', async (path) => {
		const response = await handler(new Request(`https://example.com${path}`, { method: 'HEAD' }));

		expect(response.status).toBe(405);
		await expect(response.json()).resolves.toEqual({ error: 'Method not allowed' });
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
		['/api/queue', 'POST', 401, { error: 'Authorization required.' }],
		['/api/guests', 'GET', 401, { error: 'Authorization required.' }],
		[
			'/api/lottery-registration',
			'POST',
			400,
			{ error: 'Please provide a valid lottery registration.' },
		],
		['/api/guest-information', 'POST', 400, { error: 'Please provide valid guest information.' }],
		['/api/visit', 'GET', 401, { error: 'Visit access could not be verified.' }],
		['/api/push-subscription', 'GET', 200, { configured: false, publicKey: null }],
		['/api/sms-subscription', 'GET', 200, { configured: false }],
		['/api/notification-status', 'GET', 401, { error: 'Device access could not be verified.' }],
		['/api/broadcast', 'POST', 401, { error: 'Authorization required.' }],
		['/api/reports', 'GET', 401, { error: 'Authorization required.' }],
		['/api/demo-data', 'GET', 401, { error: 'Authorization required.' }],
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
		['/api/demo-data', 401, 'Authorization required.'],
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

	it('handles malformed JSON through nested routers', async () => {
		const request = new Request('https://example.com/api/lottery-registration', {
			method: 'POST',
			body: '{broken',
		});

		const response = await handler(request);

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({ error: 'Request body must be valid JSON.' });
	});
});
