import { afterEach, describe, expect, it, vi } from 'vitest';

const { jwtVerify } = vi.hoisted(() => ({ jwtVerify: vi.fn() }));

vi.mock('jose', () => ({
	createRemoteJWKSet: vi.fn(() => 'fake-jwks'),
	jwtVerify,
}));

import { requireAuth0, verifyAuth0Token } from './auth';

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
});

describe('requireAuth0', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		jwtVerify.mockReset();
	});

	it('returns a 401 response when verification fails', async () => {
		stubAuth0Env();
		jwtVerify.mockRejectedValueOnce(new Error('expired'));

		const response = await requireAuth0(requestWithAuth('Bearer bad-token'));

		expect(response).toBeInstanceOf(Response);
		expect(response?.status).toBe(401);
		await expect(response?.json()).resolves.toEqual({ error: 'Authorization required.' });
	});

	it('returns a 401 response when the Authorization header is missing', async () => {
		stubAuth0Env();

		const response = await requireAuth0(requestWithAuth(null));

		expect(response?.status).toBe(401);
	});

	it('returns null when the token is valid, allowing the caller to proceed', async () => {
		stubAuth0Env();
		jwtVerify.mockResolvedValueOnce({ payload: { sub: 'user-123' }, protectedHeader: {} });

		const response = await requireAuth0(requestWithAuth('Bearer good-token'));

		expect(response).toBeNull();
	});
});
