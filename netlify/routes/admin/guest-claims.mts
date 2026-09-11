import { z } from 'zod';

import { requirePermission } from '../../lib/auth.mjs';
import { type AdminEnv, withPermission } from '../../lib/http-auth.mjs';
import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
import { issueGuestClaim } from '../../services/guest-claim.mjs';

const claimRequestSchema = z.object({ guestId: z.uuid() });

export const guestClaimRoutes = createRouter<AdminEnv>();

/**
 * `run:queue` lets a worker put a guest they have just added onto that guest's phone. Holding
 * `manage:guest-access` as well lifts both of a worker's limits — the guest need not be new, and
 * may already be on another phone — which is the manager's override.
 */
guestClaimRoutes.post('/guest-claims', withPermission('run:queue'), async (context) => {
	const claimRequest = claimRequestSchema.safeParse(await jsonBody(context.req.raw));

	if (!claimRequest.success) {
		return jsonError('Please name the guest to create a code for.');
	}

	const isManager =
		(await requirePermission(
			context.req.raw,
			'manage:guest-access',
			context.get('permissions'),
		)) === null;
	const result = await issueGuestClaim(claimRequest.data.guestId, {
		authority: isManager ? 'manager' : 'worker',
		actor: context.get('actor'),
	});

	return result.ok
		? Response.json(result.body, { status: 201 })
		: jsonError(result.error, result.status);
});
guestClaimRoutes.all('/guest-claims', methodNotAllowed);

export default routeHandler(createRouter<AdminEnv>().route('/api/admin', guestClaimRoutes));
