import type { KioskUnlockCode } from '../../../src/services/kiosk-unlock.js';
import { withPermission, type AdminEnv } from '../../lib/http-auth.mjs';
import { createRouter, methodNotAllowed, routeHandler } from '../../lib/http.mjs';
import { KioskAccess } from '../../services/kiosk-access.mjs';
import { getCurrentEvent } from '../../services/marketSession.mjs';
import { StandbyCode } from '../../services/standby-code.mjs';

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

/**
 * The current session's standby code, for an admin printing the standby poster. It is the same all
 * session, so a poster can go up before the draw: scanning it then says standby isn't open yet.
 * `null` with no session running, or without `KIOSK_SECRET` to sign one.
 */
kioskRoutes.get('/standby-code', withPermission('manage:sessions'), async () => {
	const codes = StandbyCode.fromEnvironment();
	const event = codes ? await getCurrentEvent() : null;
	const code = codes && event && event.status !== 'ended' ? codes.codeFor(event.id) : null;

	return Response.json({ code });
});
kioskRoutes.all('/standby-code', methodNotAllowed);

export default routeHandler(createRouter().route('/api/admin', kioskRoutes));
