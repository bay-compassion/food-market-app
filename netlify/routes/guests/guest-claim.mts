import { z } from 'zod';

import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
import { redeemGuestClaim } from '../../services/guest-claim.mjs';

const redeemSchema = z.object({ token: z.string().trim().min(32).max(200) });

export const guestClaimRoutes = createRouter();

guestClaimRoutes.post('/api/guest-claim', async (context) => {
	const redeem = redeemSchema.safeParse(await jsonBody(context.req.raw));

	if (!redeem.success) {
		return jsonError('Please provide a valid code.');
	}

	const claimed = await redeemGuestClaim(redeem.data.token);

	// Unknown, expired, and already-used codes answer identically, so the endpoint reveals nothing.
	return claimed
		? Response.json(claimed)
		: jsonError('This code is no longer valid. Ask a staff member for a new one.', 410);
});
guestClaimRoutes.all('/api/guest-claim', methodNotAllowed);

export default routeHandler(guestClaimRoutes);
