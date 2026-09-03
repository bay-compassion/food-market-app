import { eq } from 'drizzle-orm';

import { db } from '../../../db/index.mjs';
import { pushSubscriptions, smsSubscriptions, visits } from '../../../db/schema.mjs';
import { type DeviceGuestEnv, withDeviceGuest } from '../../lib/http-auth.mjs';
import { createRouter, methodNotAllowed, routeHandler } from '../../lib/http.mjs';

export const notificationStatusRoutes = createRouter<DeviceGuestEnv>();

notificationStatusRoutes.get('/api/notification-status', withDeviceGuest, async (context) => {
	const guest = context.get('guest');
	const [[pushSubscription], [smsSubscription]] = await Promise.all([
		db
			.select({ id: pushSubscriptions.id })
			.from(pushSubscriptions)
			.innerJoin(visits, eq(pushSubscriptions.visitId, visits.id))
			.where(eq(visits.guestId, guest.id))
			.limit(1),
		db
			.select({ id: smsSubscriptions.id })
			.from(smsSubscriptions)
			.where(eq(smsSubscriptions.guestId, guest.id))
			.limit(1),
	]);

	return Response.json({
		pushSubscribed: Boolean(pushSubscription),
		smsConsented: Boolean(smsSubscription),
	});
});
notificationStatusRoutes.all('/api/notification-status', methodNotAllowed);

export default routeHandler(notificationStatusRoutes);
