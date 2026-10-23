import type { KioskUnlockCode } from '../../../src/services/kiosk-unlock.js';
import { withPermission, type AdminEnv } from '../../lib/http-auth.mjs';
import { createRouter, methodNotAllowed, routeHandler } from '../../lib/http.mjs';
import { KioskAccess } from '../../services/kiosk-access.mjs';

export const kioskRoutes = createRouter<AdminEnv>();

/**
 * A code for unlocking a room display, read off a worker's phone and typed into the display. The
 * display itself never signs in, so no worker's account is ever left open on a public screen — see
 * `KioskAccess` and `/api/kiosk/unlock`.
 */
kioskRoutes.post('/kiosk/unlock-codes', withPermission('run:queue'), () =>
	Response.json(KioskAccess.fromEnvironment().issueCode() satisfies KioskUnlockCode),
);
kioskRoutes.all('/kiosk/unlock-codes', methodNotAllowed);

export default routeHandler(createRouter().route('/api/admin', kioskRoutes));
