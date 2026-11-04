import { afterEach, describe, expect, it, vi } from 'vitest';

import { Auth0Management } from './auth0-management.mjs';

afterEach(() => vi.unstubAllEnvs());

describe('Auth0 password email', () => {
	it('asks the Authentication API without a Management token', async () => {
		// Arrange
		vi.stubEnv('AUTH0_MANAGEMENT_DOMAIN', 'tenant.auth0.com');
		vi.stubEnv('VITE_AUTH0_CLIENT_ID', 'spa-client');
		const request = vi.fn<typeof fetch>(async () => new Response('sent'));

		// Act
		await new Auth0Management(request).sendPasswordEmail('new@example.test', 'Staff');
		// Assert
		const [url, init] = request.mock.calls[0]!;

		expect(request).toHaveBeenCalledTimes(1);
		expect(url).toBe('https://tenant.auth0.com/dbconnections/change_password');
		expect(new Headers(init?.headers).has('Authorization')).toBe(false);
		expect(JSON.parse(init?.body as string)).toEqual({
			email: 'new@example.test',
			connection: 'Staff',
			client_id: 'spa-client',
		});
	});

	it('reports a refusal without forwarding the provider body', async () => {
		// Arrange
		vi.stubEnv('AUTH0_MANAGEMENT_DOMAIN', 'tenant.auth0.com');
		const request = vi.fn<typeof fetch>(
			async () => new Response('new@example.test is rate limited', { status: 429 }),
		);
		// Act
		const sending = new Auth0Management(request).sendPasswordEmail('new@example.test', 'Staff');

		// Assert
		await expect(sending).rejects.toMatchObject({
			status: 503,
			message: expect.not.stringContaining('new@example.test'),
		});
	});
});

describe('Auth0 Management token recovery', () => {
	it.each([401, 403])('replaces the cached token after Auth0 returns %s', async (status) => {
		// Arrange: the cached credential was issued before the M2M grant changed.
		vi.stubEnv('AUTH0_MANAGEMENT_DOMAIN', 'tenant.auth0.com');
		vi.stubEnv('AUTH0_MANAGEMENT_CLIENT_ID', `recovery-${status}`);
		vi.stubEnv('AUTH0_MANAGEMENT_CLIENT_SECRET', 'test-secret');
		let tokenRequests = 0;
		const request = vi.fn<typeof fetch>(async (input, init) => {
			const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

			if (url.endsWith('/oauth/token')) {
				tokenRequests++;

				return Response.json({ access_token: `token-${tokenRequests}`, expires_in: 86400 });
			}

			return new Headers(init?.headers).get('Authorization') === 'Bearer token-1'
				? Response.json({ error: 'Insufficient scope' }, { status })
				: Response.json({ ok: true });
		});

		// Act: a failed mutation is never automatically repeated. A later request can recover.
		await expect(
			new Auth0Management(request).call('users/target', 'PATCH', { blocked: true }),
		).rejects.toMatchObject({ status: 503 });
		const mutationRequests = request.mock.calls.filter(([, init]) => init?.method === 'PATCH');
		const result = await new Auth0Management(request).call('roles');

		// Assert
		expect(mutationRequests).toHaveLength(1);
		expect(tokenRequests).toBe(2);
		expect(result).toEqual({ ok: true });
	});
});
