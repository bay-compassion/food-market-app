import { Config } from '@netlify/functions';
import { eq } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { smsSubscriptions } from '../../db/schema.mjs';
import type { VisitStatus } from '../../src/services/visitStateMachine.js';
import { authorizedVisit } from '../lib/visitAuth.mjs';
import { requeueNotification } from '../services/notifications.mjs';
import type { NotificationType } from '../services/pushNotifications.mjs';
import { deliverPendingSmsNotifications, smsConfiguration } from '../services/smsNotifications.mjs';

function error(message: string, status = 400) {
	return Response.json({ error: message }, { status });
}

export default async (request: Request) => {
	if (request.method === 'GET') {
		return Response.json(smsConfiguration());
	}

	if (!smsConfiguration().configured) {
		return error('SMS notifications are not configured.', 503);
	}
	const visit = await authorizedVisit(request);

	if (!visit) {
		return error('Visit access could not be verified.', 401);
	}

	if (request.method === 'DELETE') {
		await db.delete(smsSubscriptions).where(eq(smsSubscriptions.visitId, visit.id));

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
		.select({ visitId: smsSubscriptions.visitId })
		.from(smsSubscriptions)
		.where(eq(smsSubscriptions.visitId, visit.id))
		.limit(1);

	await db
		.insert(smsSubscriptions)
		.values({ visitId: visit.id })
		.onConflictDoUpdate({
			target: smsSubscriptions.visitId,
			set: { consentedAt: new Date() },
		});

	// Statuses with no entry here are terminal (served, no_show, cancelled) — subscribing at that
	// point should not replay a notification about a visit that is already over.
	const catchUpNotifications: Partial<Record<VisitStatus, NotificationType>> = {
		registered: 'registration_confirmed',
		waiting: 'lottery_selected',
		not_placed: 'lottery_not_selected',
		called: 'called',
	};
	const currentNotification = existingSubscription ? undefined : catchUpNotifications[visit.status];

	if (currentNotification) {
		await requeueNotification(db, [visit.id], currentNotification, currentNotification, ['sms']);
		await deliverPendingSmsNotifications({
			visitIds: [visit.id],
			types: [currentNotification],
			limit: 1,
		});
	}

	return Response.json({ subscribed: true });
};

export const config: Config = { path: '/api/sms-subscription' };
