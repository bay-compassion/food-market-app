import { afterEach, describe, expect, it, vi } from 'vitest';

import { Auth0Management } from './auth0-management.mjs';
import { WorkerDirectory } from './worker-directory.mjs';

function setup() {
	vi.stubEnv('AUTH0_MANAGEMENT_DOMAIN', 'tenant.auth0.com');
	vi.stubEnv('AUTH0_AUDIENCE', 'https://market.test');
	const api = new Auth0Management();
	const call = vi.spyOn(api, 'call');

	return { directory: new WorkerDirectory(api), call };
}
const admin = { id: 'rol_admin', name: 'admin' };
const worker = { id: 'rol_worker', name: 'worker' };

afterEach(() => vi.unstubAllEnvs());

describe('WorkerDirectory security', () => {
	it.each(['worker', 'developer', 'data-steward'])(
		'refuses a caller whose current role is %s',
		async (role) => {
			// Arrange
			const { directory, call } = setup();

			call
				.mockResolvedValueOnce({ user_id: 'actor' })
				.mockResolvedValueOnce([{ id: 'role', name: role }]);
			// Act / Assert
			await expect(directory.authorize('actor')).rejects.toMatchObject({ status: 403 });
			expect(call).toHaveBeenCalledTimes(2);
		},
	);

	it.each(['admin', 'owner'])('allows a current %s', async (role) => {
		// Arrange
		const { directory, call } = setup();

		call
			.mockResolvedValueOnce({ user_id: 'actor' })
			.mockResolvedValueOnce([{ id: 'role', name: role }]);
		// Act / Assert
		await expect(directory.authorize('actor')).resolves.toBe('actor');
	});

	it('refuses blocked admins and missing subjects', async () => {
		// Arrange
		const { directory, call } = setup();

		call.mockResolvedValueOnce({ blocked: true }).mockResolvedValueOnce([admin]);
		// Act / Assert
		await expect(directory.authorize(undefined)).rejects.toMatchObject({ status: 401 });
		await expect(directory.authorize('actor')).rejects.toMatchObject({ status: 403 });
	});

	it.each(['remove', 'worker', 'admin'] as const)(
		'prevents self %s without contacting Auth0',
		async (command) => {
			// Arrange
			const { directory, call } = setup();

			// Act / Assert
			await expect(directory.change('self', 'self', command)).rejects.toMatchObject({
				status: 403,
			});
			expect(call).not.toHaveBeenCalled();
		},
	);

	it.each(['owner', 'developer', 'data-steward', 'print-station'])(
		'protects accounts also holding %s',
		async (name) => {
			// Arrange
			const { directory, call } = setup();

			call.mockResolvedValueOnce([worker, { id: 'protected', name }]);
			// Act / Assert
			await expect(directory.change('actor', 'target', 'remove')).rejects.toMatchObject({
				status: 403,
			});
			expect(call).toHaveBeenCalledTimes(1);
		},
	);

	it('blocks access without deleting the user or its roles', async () => {
		// Arrange
		const { directory, call } = setup();

		call.mockResolvedValueOnce([admin]).mockResolvedValueOnce(undefined);
		// Act
		await directory.change('actor', 'auth0|target', 'remove');
		// Assert
		expect(call).toHaveBeenLastCalledWith('users/auth0%7Ctarget', 'PATCH', { blocked: true });
		expect(call).toHaveBeenCalledTimes(2);
	});

	it('blocks before demotion and only unblocks after assigning the new role', async () => {
		// Arrange
		const { directory, call } = setup();

		call
			.mockResolvedValueOnce([admin])
			.mockResolvedValueOnce([worker])
			.mockResolvedValue(undefined);
		// Act
		await directory.change('actor', 'target', 'worker');
		// Assert
		expect(call.mock.calls.slice(2)).toEqual([
			['users/target', 'PATCH', { blocked: true }],
			['users/target/roles', 'DELETE', { roles: ['rol_admin'] }],
			['users/target/roles', 'POST', { roles: ['rol_worker'] }],
			['users/target', 'PATCH', { blocked: false }],
		]);
	});

	it('does not unblock if role removal fails', async () => {
		// Arrange
		const { directory, call } = setup();

		call
			.mockResolvedValueOnce([admin])
			.mockResolvedValueOnce([worker])
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error('provider failed'));
		// Act / Assert
		await expect(directory.change('actor', 'target', 'worker')).rejects.toThrow();
		expect(call).not.toHaveBeenCalledWith('users/target', 'PATCH', { blocked: false });
	});

	it('creates a blocked user with a secret password before granting access', async () => {
		// Arrange
		const { directory, call } = setup();

		vi.stubEnv('AUTH0_WORKER_CONNECTION', 'Staff');
		call
			.mockResolvedValueOnce([admin])
			.mockResolvedValueOnce({ user_id: 'new' })
			.mockResolvedValue(undefined);
		// Act
		await directory.add('new@example.test', 'New Worker', 'admin');
		// Assert
		expect(call.mock.calls[1]).toEqual([
			'users',
			'POST',
			expect.objectContaining({
				blocked: true,
				email_verified: false,
				connection: 'Staff',
				password: expect.stringMatching(/^Aa1!.{64}$/),
			}),
		]);
		expect(call.mock.calls.slice(2)).toEqual([
			['users/new/roles', 'POST', { roles: ['rol_admin'] }],
			['users/new', 'PATCH', { blocked: false }],
		]);
	});

	it('ignores permissions from a different API', async () => {
		// Arrange
		const { directory, call } = setup();

		call.mockResolvedValueOnce({ blocked: false }).mockResolvedValueOnce([
			{ permission_name: 'manage:workers', resource_server_identifier: 'another-api' },
			{ permission_name: 'run:queue', resource_server_identifier: 'https://market.test' },
		]);
		// Act
		const permissions = await directory.currentPermissions('actor');

		// Assert
		expect(permissions).toEqual(['run:queue']);
	});

	it('returns no permissions for a blocked user without reading grants', async () => {
		// Arrange
		const { directory, call } = setup();

		call.mockResolvedValueOnce({ blocked: true });
		// Act
		const permissions = await directory.currentPermissions('actor');

		// Assert
		expect(permissions).toEqual([]);
		expect(call).toHaveBeenCalledTimes(1);
	});
	it('shares overlapping permission reads without caching a completed authorization result', async () => {
		// Arrange
		const { directory, call } = setup();

		call
			.mockResolvedValueOnce({ blocked: false })
			.mockResolvedValueOnce([
				{ permission_name: 'run:queue', resource_server_identifier: 'https://market.test' },
			])
			.mockResolvedValueOnce({ blocked: true });

		// Act
		const permissions = await Promise.all([
			directory.currentPermissions('actor'),
			directory.currentPermissions('actor'),
		]);
		const revoked = await directory.currentPermissions('actor');

		// Assert
		expect(permissions).toEqual([['run:queue'], ['run:queue']]);
		expect(revoked).toEqual([]);
		expect(call).toHaveBeenCalledTimes(3);
	});
	it('starts a new authorization check after removal even when an older read is still pending', async () => {
		// Arrange
		const { directory, call } = setup();
		const staleProfile = Promise.withResolvers<{ blocked: boolean }>();

		call
			.mockReturnValueOnce(staleProfile.promise)
			.mockResolvedValueOnce([worker])
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce({ blocked: true })
			.mockResolvedValueOnce([
				{ permission_name: 'run:queue', resource_server_identifier: 'https://market.test' },
			]);

		// Act
		const startedBeforeRemoval = directory.currentPermissions('target');

		await directory.change('actor', 'target', 'remove');
		const revoked = await directory.currentPermissions('target');

		staleProfile.resolve({ blocked: false });
		await startedBeforeRemoval;

		// Assert
		expect(revoked).toEqual([]);
		expect(call).toHaveBeenCalledTimes(5);
	});
});
