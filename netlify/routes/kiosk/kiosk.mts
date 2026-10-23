import { z } from 'zod';

import {
	kioskUnlockCodePattern,
	type KioskUnlockResult,
} from '../../../src/services/kiosk-unlock.js';
import { withKioskToken } from '../../lib/http-auth.mjs';
import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
import { KioskAccess } from '../../services/kiosk-access.mjs';
import { queueBoard } from '../../services/queue-board.mjs';

const unlockSchema = z.object({ code: z.string().regex(kioskUnlockCodePattern) });

/**
 * The room display's own endpoints, outside `/api/admin` and its Auth0 gate: a display never signs
 * in, so a worker's account is never left open on a screen in a public room.
 */
export const kioskRoutes = createRouter();

/** A display trades a worker's unlock code for the token it polls with. */
kioskRoutes.post('/api/kiosk/unlock', async (context) => {
	const body = unlockSchema.safeParse(await jsonBody(context.req.raw));
	const token = body.success ? await KioskAccess.fromEnvironment().exchange(body.data.code) : null;

	if (!token) {
		return jsonError('That code didn’t work.', 401);
	}

	return Response.json({ token } satisfies KioskUnlockResult);
});
kioskRoutes.all('/api/kiosk/unlock', methodNotAllowed);

/** The board itself: queue numbers only, never a name. */
kioskRoutes.get('/api/kiosk/board', withKioskToken, async () => Response.json(await queueBoard()));
kioskRoutes.all('/api/kiosk/board', methodNotAllowed);

export default routeHandler(kioskRoutes);
