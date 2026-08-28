import { Config } from '@netlify/functions';
import { and, desc, eq, ne } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { marketEvents, smsSubscriptions, visits } from '../../db/schema.mjs';
import type { VisitStatus } from '../../src/services/visitStateMachine.js';
import { authorizedGuest } from '../lib/deviceAuth.mjs';
import { requeueNotification } from '../services/notifications.mjs';
import type { NotificationType } from '../services/pushNotifications.mjs';
import { deliverPendingSmsNotifications, smsConfiguration } from '../services/smsNotifications.mjs';

function error(message: string, status = 400) {
	return Response.json({ error: message }, { status });
}

async function activeVisitForGuest(guestId: string) {
	const [event] = await db
		.select({ id: marketEvents.id })
		.from(marketEvents)
		.where(ne(marketEvents.status, 'ended'))
		.orderBy(desc(marketEvents.createdAt))
		.limit(1);

	if (!event) {
		return null;
	}

	const [visit] = await db
		.select({ id: visits.id, status: visits.status })
		.from(visits)
		.where(and(eq(visits.guestId, guestId), eq(visits.marketEventId, event.id)))
		.orderBy(desc(visits.createdAt))
		.limit(1);

	return visit ?? null;
}

export default async (request: Request) => {
	if (request.method === 'GET') {
		return Response.json(smsConfiguration());
	}

	if (!smsConfiguration().configured) {
		return error('SMS notifications are not configured.', 503);
	}
	const guest = await authorizedGuest(request);

	if (!guest) {
		return error('Device access could not be verified.', 401);
	}

	if (request.method === 'DELETE') {
		await db.delete(smsSubscriptions).where(eq(smsSubscriptions.guestId, guest.id));

		return new Response(null, { status: 204 });
	}

	if (request.method !== 'POST') {
		return error('Method not allowed', 405);
	}

	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return error('Request body must be valid JSON.');
	}
	const consent = Boolean(
		body && typeof body === 'object' && (body as { consent?: unknown }).consent === true,
	);

	if (!consent) {
		return error('Please confirm you consent to receive text messages.');
	}

	const [existingSubscription] = await db
		.select({ guestId: smsSubscriptions.guestId })
		.from(smsSubscriptions)
		.where(eq(smsSubscriptions.guestId, guest.id))
		.limit(1);

	await db
		.insert(smsSubscriptions)
		.values({ guestId: guest.id })
		.onConflictDoUpdate({
			target: smsSubscriptions.guestId,
			set: { consentedAt: new Date() },
		});

	if (existingSubscription) {
		return Response.json({ subscribed: true });
	}

	const activeVisit = await activeVisitForGuest(guest.id);

	if (!activeVisit) {
		return Response.json({ subscribed: true });
	}

	// Statuses with no entry here are terminal (served, no_show, cancelled) — subscribing at that
	// point should not replay a notification about a visit that is already over.
	const catchUpNotifications: Partial<Record<VisitStatus, NotificationType>> = {
		registered: 'registration_confirmed',
		waiting: 'lottery_selected',
		not_placed: 'lottery_not_selected',
		called: 'called',
	};
	const currentNotification = catchUpNotifications[activeVisit.status];

	if (currentNotification) {
		await requeueNotification(db, [activeVisit.id], currentNotification, currentNotification, [
			'sms',
		]);
		await deliverPendingSmsNotifications({
			visitIds: [activeVisit.id],
			types: [currentNotification],
			limit: 1,
		});
	}

	return Response.json({ subscribed: true });
};

export const config: Config = { path: '/api/sms-subscription' };
