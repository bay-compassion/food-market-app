import { z } from 'zod';

import { withPermission } from '../../lib/http-auth.mjs';
import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
import { issueGuestClaim } from '../../services/guest-claim.mjs';

const claimRequestSchema = z.object({ guestId: z.uuid() });

async function createGuestClaim(request: Request) {
	const claimRequest = claimRequestSchema.safeParse(await jsonBody(request));

	if (!claimRequest.success) {
		return jsonError('Please name the guest to create a code for.');
	}

	const result = await issueGuestClaim(claimRequest.data.guestId);

	return result.ok
		? Response.json(result.body, { status: 201 })
		: jsonError(result.error, result.status);
}

export const guestClaimRoutes = createRouter();

guestClaimRoutes.post('/guest-claims', withPermission('run:queue'), (context) =>
	createGuestClaim(context.req.raw),
);
guestClaimRoutes.all('/guest-claims', methodNotAllowed);

export default routeHandler(createRouter().route('/api/admin', guestClaimRoutes));
