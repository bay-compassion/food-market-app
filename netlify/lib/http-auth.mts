import { createMiddleware } from 'hono/factory';

import { grantedPermissions, type Permission } from '../../src/services/permissions.js';
import { requirePermission, verifyAuth0Token } from './auth.mjs';
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
	Variables: { permissions: Permission[] };
};

/** Authenticate every request in the admin subtree before dispatching a route. */
export const withAuth0 = createMiddleware<AdminEnv>(async (context, next) => {
	try {
		const { payload } = await verifyAuth0Token(context.req.raw);

		context.set('permissions', grantedPermissions(payload.permissions));
	} catch {
		return jsonError('Authorization required.', 401);
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

export const withVisit = createMiddleware<VisitAccessEnv>(async (context, next) => {
	const visit = await authorizedVisit(context.req.raw);

	if (!visit) {
		return jsonError('Visit access could not be verified.', 401);
	}

	context.set('visit', visit);
	await next();
});
