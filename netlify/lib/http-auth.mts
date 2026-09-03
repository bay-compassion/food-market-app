import { createMiddleware } from 'hono/factory';

import type { Permission } from '../../src/services/permissions.js';
import { requirePermission } from './auth.mjs';
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

export function withPermission(permission: Permission) {
	return createMiddleware(async (context, next) => {
		const forbidden = await requirePermission(context.req.raw, permission);

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
