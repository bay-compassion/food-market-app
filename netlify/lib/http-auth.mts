import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';

import { grantedPermissions, type Permission } from '../../src/services/permissions.js';
import type { VisitEventActor } from '../../src/services/visit-events.js';
import { Auth0Management } from '../services/auth0-management.mjs';
import { KioskAccess } from '../services/kiosk-access.mjs';
import { WorkerDirectory } from '../services/worker-directory.mjs';
import { requirePermission, verifyAuth0Token, workerNameFrom } from './auth.mjs';
import { authorizedGuest } from './deviceAuth.mjs';
import { jsonError } from './http.mjs';
import { authorizedVisit } from './visitAuth.mjs';

export type DeviceGuestEnv = {
	Variables: {
		guest: NonNullable<Awaited<ReturnType<typeof authorizedGuest>>>;
	};
};

export type VisitAccessEnv = {
	Variables: {
		visit: NonNullable<Awaited<ReturnType<typeof authorizedVisit>>>;
	};
};

export type AdminEnv = {
	Variables: {
		permissions: Permission[];
		/** The Auth0 subject of the signed-in worker, for audit records. Absent on a standalone route. */
		actor?: string;
		/** The signed-in worker's name, from the `workerNameClaim` on their token, when it has one. */
		actorName?: string | null;
	};
};

/** Authenticate every request in the admin subtree before dispatching a route. */
export const withAuth0 = createMiddleware<AdminEnv>(async (context, next) => {
	try {
		const { payload } = await verifyAuth0Token(context.req.raw);

		context.set('permissions', grantedPermissions(payload.permissions));
		context.set('actor', payload.sub);
		context.set('actorName', workerNameFrom(payload));
	} catch {
		return jsonError('Authorization required.', 401);
	}

	// Once management is configured, removals/demotions also constrain already-issued JWTs.
	// Never cache this result: blocking an account must take effect on its next request.
	if (Auth0Management.configured) {
		try {
			const actor = context.get('actor');

			if (!actor) {
				return jsonError('Authorization required.', 401);
			}
			const current = await new WorkerDirectory().currentPermissions(actor);

			context.set(
				'permissions',
				context.get('permissions').filter((permission) => current.includes(permission)),
			);
		} catch {
			return jsonError('Current account access could not be verified. Try again later.', 503);
		}
	}

	await next();
});

export function withPermission(permission: Permission) {
	return createMiddleware<AdminEnv>(async (context, next) => {
		const forbidden = await requirePermission(
			context.req.raw,
			permission,
			context.get('permissions'),
		);

		if (forbidden) {
			return forbidden;
		}

		await next();
	});
}

export const withDeviceGuest = createMiddleware<DeviceGuestEnv>(async (context, next) => {
	const guest = await authorizedGuest(context.req.raw);

	if (!guest) {
		return jsonError('Device access could not be verified.', 401);
	}

	context.set('guest', guest);
	await next();
});

/**
 * Admits a room display holding a kiosk token — no Auth0, and no database read, so a request
 * without one is turned away before anything wakes up. See `KioskAccess`.
 */
export const withKioskToken = createMiddleware(async (context, next) => {
	const match = context.req.header('Authorization')?.match(/^Bearer\s+(\S+)$/);

	if (!match || !(await KioskAccess.fromEnvironment().verify(match[1]!))) {
		return jsonError('This display needs to be unlocked.', 401);
	}

	await next();
});

export const withVisit = createMiddleware<VisitAccessEnv>(async (context, next) => {
	const visit = await authorizedVisit(context.req.raw);

	if (!visit) {
		return jsonError('Visit access could not be verified.', 401);
	}

	context.set('visit', visit);
	await next();
});

/** The signed-in worker as a visit history names them. Both parts are null on a standalone route. */
export function workerActor(context: Context<AdminEnv>): VisitEventActor {
	return {
		kind: 'worker',
		id: context.get('actor') ?? null,
		name: context.get('actorName') ?? null,
	};
}
