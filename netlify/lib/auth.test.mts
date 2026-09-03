import { afterEach, describe, expect, it, vi } from 'vitest';

const { jwtVerify, createRemoteJWKSet } = vi.hoisted(() => ({
	jwtVerify: vi.fn(),
	createRemoteJWKSet: vi.fn(() => 'fake-jwks'),
}));

vi.mock('jose', () => ({
	createRemoteJWKSet,
	jwtVerify,
}));

import { requirePermission, verifyAuth0Token } from './auth.mjs';

function requestWithAuth(header: string | null) {
	const headers = new Headers();

	if (header !== null) {
		headers.set('Authorization', header);
	}

	return new Request('https://example.com/api/market', { headers });
}

function stubAuth0Env() {
	vi.stubEnv('AUTH0_ISSUER', 'https://example.auth0.com');
	vi.stubEnv('AUTH0_AUDIENCE', 'https://api.example.com');
	vi.stubEnv('VITE_AUTH0_ISSUER', '');
	vi.stubEnv('VITE_AUTH0_AUDIENCE', '');
}

describe('verifyAuth0Token', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		jwtVerify.mockReset();
		createRemoteJWKSet.mockClear();
	});

	it('rejects when the Authorization header is missing', async () => {
		stubAuth0Env();

		await expect(verifyAuth0Token(requestWithAuth(null))).rejects.toThrow(
			'Missing or invalid Authorization header.',
		);
		expect(jwtVerify).not.toHaveBeenCalled();
	});

	it('rejects a malformed Authorization header', async () => {
		stubAuth0Env();

		await expect(verifyAuth0Token(requestWithAuth('Bearer'))).rejects.toThrow(
			'Missing or invalid Authorization header.',
		);
	});

	it('rejects a non-Bearer scheme', async () => {
		stubAuth0Env();

		await expect(verifyAuth0Token(requestWithAuth('Basic abc123'))).rejects.toThrow(
			'Missing or invalid Authorization header.',
		);
		expect(jwtVerify).not.toHaveBeenCalled();
	});

	it('propagates a jwtVerify failure for an invalid or expired token', async () => {
		stubAuth0Env();
		jwtVerify.mockRejectedValueOnce(new Error('signature verification failed'));

		await expect(verifyAuth0Token(requestWithAuth('Bearer bad-token'))).rejects.toThrow(
			'signature verification failed',
		);
	});

	it('throws when Auth0 environment variables are not configured', async () => {
		vi.stubEnv('AUTH0_ISSUER', '');
		vi.stubEnv('AUTH0_AUDIENCE', '');
		vi.stubEnv('VITE_AUTH0_ISSUER', '');
		vi.stubEnv('VITE_AUTH0_AUDIENCE', '');

		await expect(verifyAuth0Token(requestWithAuth('Bearer good-token'))).rejects.toThrow(
			'Auth0 environment variables are not configured.',
		);
		expect(jwtVerify).not.toHaveBeenCalled();
	});

	it('verifies a well-formed token against the configured issuer and audience', async () => {
		stubAuth0Env();
		const verified = { payload: { sub: 'user-123' }, protectedHeader: { alg: 'RS256' } };

		jwtVerify.mockResolvedValueOnce(verified);

		await expect(verifyAuth0Token(requestWithAuth('Bearer good-token'))).resolves.toBe(verified);
		expect(jwtVerify).toHaveBeenCalledWith(
			'good-token',
			'fake-jwks',
			expect.objectContaining({
				issuer: 'https://example.auth0.com/',
				audience: 'https://api.example.com',
				algorithms: ['RS256'],
			}),
		);
	});

	it('reuses the key resolver across requests and replaces it when the issuer changes', async () => {
		stubAuth0Env();
		vi.stubEnv('AUTH0_ISSUER', 'https://cached.auth0.com');
		const request = requestWithAuth('Bearer good-token');

		await verifyAuth0Token(request);
		await verifyAuth0Token(request);

		expect(createRemoteJWKSet).toHaveBeenCalledTimes(1);
		expect(createRemoteJWKSet).toHaveBeenLastCalledWith(
			new URL('https://cached.auth0.com/.well-known/jwks.json'),
		);

		vi.stubEnv('AUTH0_ISSUER', 'https://changed.auth0.com/');
		await verifyAuth0Token(request);

		expect(createRemoteJWKSet).toHaveBeenCalledTimes(2);
		expect(createRemoteJWKSet).toHaveBeenLastCalledWith(
			new URL('https://changed.auth0.com/.well-known/jwks.json'),
		);
	});
});

describe('requirePermission', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		jwtVerify.mockReset();
	});

	function tokenWith(permissions: unknown) {
		jwtVerify.mockResolvedValueOnce({
			payload: { sub: 'user-123', permissions },
			protectedHeader: {},
		});
	}

	it('returns a 401 when verification fails', async () => {
		stubAuth0Env();
		jwtVerify.mockRejectedValueOnce(new Error('expired'));

		const response = await requirePermission(requestWithAuth('Bearer bad-token'), 'run:queue');

		expect(response).toBeInstanceOf(Response);
		expect(response?.status).toBe(401);
		await expect(response?.json()).resolves.toEqual({ error: 'Authorization required.' });
	});

	it('returns a 401 when the Authorization header is missing', async () => {
		stubAuth0Env();

		const response = await requirePermission(requestWithAuth(null), 'run:queue');

		expect(response?.status).toBe(401);
	});

	it('returns null when the token carries the permission', async () => {
		stubAuth0Env();
		tokenWith(['run:queue', 'read:reports']);

		const response = await requirePermission(requestWithAuth('Bearer good-token'), 'run:queue');

		expect(response).toBeNull();
	});

	// 403, not 401: the token is fine, so signing in again would just loop.
	it('returns a 403 when a valid token lacks the permission', async () => {
		stubAuth0Env();
		tokenWith(['run:queue']);

		const response = await requirePermission(
			requestWithAuth('Bearer good-token'),
			'export:guest-data',
		);

		expect(response?.status).toBe(403);
		await expect(response?.json()).resolves.toEqual({
			error: 'Your account does not have access to this.',
		});
	});

	it('treats a token with no permissions claim as holding none', async () => {
		stubAuth0Env();
		tokenWith(undefined);

		const response = await requirePermission(requestWithAuth('Bearer good-token'), 'run:queue');

		expect(response?.status).toBe(403);
	});

	it('ignores permissions it does not recognise', async () => {
		stubAuth0Env();
		tokenWith(['admin:everything', 'run:queue']);

		const granted = await requirePermission(requestWithAuth('Bearer good-token'), 'run:queue');

		expect(granted).toBeNull();

		tokenWith(['admin:everything']);
		const refused = await requirePermission(
			requestWithAuth('Bearer good-token'),
			'manage:sessions',
		);

		expect(refused?.status).toBe(403);
	});
});
