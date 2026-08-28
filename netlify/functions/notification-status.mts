import { Config } from '@netlify/functions';
import { eq } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { pushSubscriptions, smsSubscriptions, visits } from '../../db/schema.mjs';
import { authorizedGuest } from '../lib/deviceAuth.mjs';

export default async (request: Request) => {
	if (request.method !== 'GET') {
		return Response.json({ error: 'Method not allowed' }, { status: 405 });
	}

	const guest = await authorizedGuest(request);

	if (!guest) {
		return Response.json({ error: 'Device access could not be verified.' }, { status: 401 });
	}

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
};

export const config: Config = { path: '/api/notification-status' };
