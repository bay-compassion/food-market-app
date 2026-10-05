import { withPermission, type AdminEnv } from '../../lib/http-auth.mjs';
import { createRouter, methodNotAllowed, routeHandler } from '../../lib/http.mjs';
import { queueBoard } from '../../services/queue-board.mjs';

export const kioskRoutes = createRouter<AdminEnv>();

/**
 * The room display's data. Gated on `view:kiosk` rather than left public like `/api/market`: the
 * kiosk signs in as an account holding only this, so a passer-by at the screen holds nothing that
 * can change the queue.
 */
kioskRoutes.get('/kiosk', withPermission('view:kiosk'), async () =>
	Response.json(await queueBoard()),
);
kioskRoutes.all('/kiosk', methodNotAllowed);

export default routeHandler(createRouter().route('/api/admin', kioskRoutes));
