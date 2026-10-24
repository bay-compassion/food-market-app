import { randomBytes } from 'node:crypto';

import { HTTPException } from 'hono/http-exception';

import { grantedPermissions, type Permission } from '../../src/services/permissions.js';
import type { WorkerAccount, WorkerPage, WorkerRole } from '../../src/services/workers.js';
import { Auth0Management } from './auth0-management.mjs';

type Role = { id: string; name: string };
type User = { user_id: string; name?: string; email?: string; blocked?: boolean };

/** Only ordinary staff accounts can be changed. Owners and special-purpose accounts stay in Auth0. */
export class WorkerDirectory {
	private static readonly pendingPermissions = new Map<string, Promise<Permission[]>>();
	constructor(private readonly api = new Auth0Management()) {}

	private userPath(id: string): string {
		return `users/${encodeURIComponent(id)}`;
	}

	private roles(id: string): Promise<Role[]> {
		// Refuse ambiguous/truncated role sets rather than overlooking an owner role.
		return this.api.call<Role[]>(`${this.userPath(id)}/roles?per_page=100`);
	}

	private isEditable(roles: Role[]): boolean {
		return (
			roles.length < 100 && roles.every((role) => role.name === 'worker' || role.name === 'admin')
		);
	}

	async authorize(actor: string | undefined): Promise<string> {
		if (!actor) {
			throw new HTTPException(401, { message: 'Sign in to manage workers.' });
		}
		const user = await this.api.call<User>(this.userPath(actor));
		const roles = await this.roles(actor);

		if (user.blocked || !roles.some((role) => role.name === 'admin' || role.name === 'owner')) {
			throw new HTTPException(403, { message: 'Only admins can manage workers.' });
		}

		return actor;
	}

	/** Coalesce overlapping checks only; completed authorization results are never cached. */
	currentPermissions(actor: string): Promise<Permission[]> {
		const key = this.permissionKey(actor);
		const existing = WorkerDirectory.pendingPermissions.get(key);

		if (existing) {
			return existing;
		}

		const pending = this.readCurrentPermissions(actor).finally(() => {
			if (WorkerDirectory.pendingPermissions.get(key) === pending) {
				WorkerDirectory.pendingPermissions.delete(key);
			}
		});

		WorkerDirectory.pendingPermissions.set(key, pending);

		return pending;
	}

	private permissionKey(actor: string): string {
		return JSON.stringify([
			process.env.AUTH0_MANAGEMENT_DOMAIN,
			process.env.AUTH0_MANAGEMENT_CLIENT_ID,
			process.env.AUTH0_AUDIENCE ?? process.env.VITE_AUTH0_AUDIENCE,
			actor,
		]);
	}

	/** Intersect with the signed token at the middleware boundary; never grant fresh powers to it. */
	private async readCurrentPermissions(actor: string): Promise<Permission[]> {
		const user = await this.api.call<User>(this.userPath(actor));

		if (user.blocked) {
			return [];
		}
		const all: string[] = [];
		const audience = process.env.AUTH0_AUDIENCE ?? process.env.VITE_AUTH0_AUDIENCE;

		if (!audience) {
			throw new HTTPException(503, { message: 'API audience is not configured.' });
		}

		for (let page = 0; page < 100; page++) {
			const items = await this.api.call<
				{ permission_name: string; resource_server_identifier: string }[]
			>(`${this.userPath(actor)}/permissions?per_page=100&page=${page}`);

			all.push(
				...items
					.filter((item) => item.resource_server_identifier === audience)
					.map((item) => item.permission_name),
			);

			if (items.length < 100) {
				return grantedPermissions(all);
			}
		}
		throw new HTTPException(503, { message: 'Could not verify current permissions.' });
	}

	async list(actor: string, page: number): Promise<WorkerPage> {
		const users = await this.api.call<User[]>(
			`users?per_page=10&page=${page}&sort=email:1&fields=user_id,name,email,blocked&include_fields=true`,
		);
		const workers: WorkerAccount[] = [];

		for (const user of users) {
			const roles = await this.roles(user.user_id);

			workers.push({
				id: user.user_id,
				name: user.name ?? '',
				email: user.email ?? '',
				blocked: user.blocked ?? false,
				roles: roles.map((role) => role.name),
				self: user.user_id === actor,
				editable: user.user_id !== actor && this.isEditable(roles),
			});
		}

		return { workers, page, hasMore: users.length === 10 };
	}

	private async roleId(name: WorkerRole): Promise<string> {
		const matches = await this.api.call<Role[]>(`roles?name_filter=${name}&per_page=100`);
		const role = matches.find((role) => role.name === name);

		if (!role) {
			throw new HTTPException(503, { message: 'Staff roles are not configured in Auth0.' });
		}

		return role.id;
	}

	async add(email: string, name: string, role: WorkerRole): Promise<void> {
		const connection = process.env.AUTH0_WORKER_CONNECTION;

		if (!connection) {
			throw new HTTPException(503, { message: 'Worker connection is not configured.' });
		}
		const roleId = await this.roleId(role);
		// Passwords never leave the server. The worker sets their own via Auth0's Forgot Password flow.
		// Create blocked first: an interrupted role assignment cannot leave a usable unassigned account.
		const user = await this.api.call<User>('users', 'POST', {
			email,
			name,
			connection,
			password: `Aa1!${randomBytes(48).toString('base64url')}`,
			blocked: true,
			email_verified: false,
			verify_email: false,
		});

		await this.api.call(`${this.userPath(user.user_id)}/roles`, 'POST', { roles: [roleId] });
		await this.setBlocked(user.user_id, false);
	}

	private async setBlocked(target: string, blocked: boolean): Promise<void> {
		const key = this.permissionKey(target);

		WorkerDirectory.pendingPermissions.delete(key);

		try {
			await this.api.call(this.userPath(target), 'PATCH', { blocked });
		} finally {
			// Requests after an access change must not join a check started before it.
			WorkerDirectory.pendingPermissions.delete(key);
		}
	}

	async change(actor: string, target: string, command: WorkerRole | 'remove'): Promise<void> {
		if (actor === target) {
			throw new HTTPException(403, { message: 'You cannot change your own access.' });
		}
		const roles = await this.roles(target);

		if (!this.isEditable(roles)) {
			throw new HTTPException(403, {
				message: 'Manage this account in Auth0. Owners and special roles cannot be changed here.',
			});
		}

		if (command === 'remove') {
			await this.setBlocked(target, true);

			return;
		}
		const roleId = await this.roleId(command);

		// Block first so a partial failure leaves no usable elevated account. Refresh/retry repairs it.
		await this.setBlocked(target, true);
		const removed = roles.filter((role) => role.id !== roleId).map((role) => role.id);

		if (removed.length) {
			await this.api.call(`${this.userPath(target)}/roles`, 'DELETE', { roles: removed });
		}
		await this.api.call(`${this.userPath(target)}/roles`, 'POST', { roles: [roleId] });
		await this.setBlocked(target, false);
	}
}
