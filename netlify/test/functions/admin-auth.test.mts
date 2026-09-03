import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { permissions } from '../../../src/services/permissions.js';
import { db, queueResult, resetDbStub } from '../dbStub.mjs';

const { jwtVerify } = vi.hoisted(() => ({ jwtVerify: vi.fn() }));

vi.mock('../../../db/index.mjs', () => ({ db }));
vi.mock('jose', () => ({ createRemoteJWKSet: vi.fn(), jwtVerify }));

import handler from '../../functions/api.mjs';
import { withAuth0 } from '../../lib/http-auth.mjs';
import { createRouter } from '../../lib/http.mjs';

function request(path: string, method: string, body?: string) {
	return new Request(`https://example.com${path}`, {
		method,
		headers: { Authorization: 'Bearer test-token' },
		body,
	});
}

beforeEach(() => {
	vi.stubEnv('AUTH0_ISSUER', 'https://example.auth0.com');
	vi.stubEnv('AUTH0_AUDIENCE', 'https://api.example.com');
});
afterEach(() => {
	jwtVerify.mockReset();
	resetDbStub();
	vi.unstubAllEnvs();
});

describe('admin authentication boundary', () => {
	it.each([
		['/api/admin', 'GET'],
		['/api/admin/unknown', 'GET'],
		['/api/admin/market', 'POST'],
		['/api/admin/market', 'PUT'],
		['/api/admin/guests', 'GET'],
		['/api/admin/queue', 'POST'],
		['/api/admin/reports', 'GET'],
		['/api/admin/broadcast', 'POST'],
		['/api/admin/demo-data', 'GET'],
		['/api/admin/market', 'OPTIONS'],
	])('rejects invalid tokens before dispatching %s %s', async (path, method) => {
		jwtVerify.mockRejectedValue(new Error('Expired token'));

		const response = await handler(
			request(path, method, method === 'POST' ? '{broken' : undefined),
		);

		expect(response.status).toBe(401);
		expect(db.select).not.toHaveBeenCalled();
		expect(db.insert).not.toHaveBeenCalled();
	});

	it('protects a new route without a route-level permission middleware', async () => {
		const reached = vi.fn(() => Response.json({ ok: true }));
		const admin = createRouter().use('*', withAuth0).get('/new', reached);
		const app = createRouter().route('/api/admin', admin);

		const response = await app.request('/api/admin/new');

		expect(response.status).toBe(401);
		expect(reached).not.toHaveBeenCalled();
	});

	it('verifies once and passes permitted requests to the handler', async () => {
		jwtVerify.mockResolvedValue({ payload: { permissions: ['run:queue'] } });
		queueResult([]);

		const response = await handler(request('/api/admin/market?view=history', 'GET'));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual([]);
		expect(jwtVerify).toHaveBeenCalledTimes(1);
	});

	it.each([undefined, [], ['unknown:permission']])(
		'rejects a valid token without the required permission (%j)',
		async (granted) => {
			jwtVerify.mockResolvedValue({ payload: { permissions: granted } });

			const response = await handler(request('/api/admin/guests', 'GET'));

			expect(response.status).toBe(403);
			expect(db.select).not.toHaveBeenCalled();
			expect(jwtVerify).toHaveBeenCalledTimes(1);
		},
	);

	it.each([
		'/api/guests',
		'/api/queue',
		'/api/reports',
		'/api/broadcast',
		'/api/demo-data',
		'/api/market?view=history',
	])('removes the old protected URL %s', async (path) => {
		jwtVerify.mockResolvedValue({ payload: { permissions } });

		const response = await handler(request(path, 'GET'));

		expect(response.status).toBe(404);
		expect(db.select).not.toHaveBeenCalled();
	});

	it.each(['POST', 'PUT'])('does not allow %s on the public market endpoint', async (method) => {
		const response = await handler(request('/api/market', method, '{}'));

		expect(response.status).toBe(405);
		expect(jwtVerify).not.toHaveBeenCalled();
		expect(db.select).not.toHaveBeenCalled();
	});
});
