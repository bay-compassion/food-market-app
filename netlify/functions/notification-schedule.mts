import type { Config } from '@netlify/functions';
import { and, eq, inArray, lte } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { marketEvents, visits } from '../../db/schema.mjs';
import { registrationGraceDeadline } from '../../src/services/sessionStateMachine.js';
import { deliverQueuedNotifications, queueNotification } from '../services/notifications.mjs';
import { notificationsEnabled } from '../services/pushNotifications.mjs';

export default async () => {
	if (!notificationsEnabled()) {
		return;
	}
	const now = new Date();

	await db
		.update(marketEvents)
		.set({ status: 'registration_open' })
		.where(and(eq(marketEvents.status, 'scheduled'), lte(marketEvents.registrationOpensAt, now)));

	const dueEvents = await db
		.select({ id: marketEvents.id, registrationClosesAt: marketEvents.registrationClosesAt })
		.from(marketEvents)
		.where(
			and(
				inArray(marketEvents.status, ['scheduled', 'registration_open']),
				lte(marketEvents.registrationClosesAt, now),
			),
		);

	for (const event of dueEvents) {
		await db.transaction(async (tx) => {
			const registrationGraceEndsAt = registrationGraceDeadline(event);
			const [closed] = await tx
				.update(marketEvents)
				.set({ status: 'registration_closed', registrationGraceEndsAt })
				.where(
					and(
						eq(marketEvents.id, event.id),
						inArray(marketEvents.status, ['scheduled', 'registration_open']),
					),
				)
				.returning({ id: marketEvents.id });

			if (!closed) {
				return;
			}
			const registrations = await tx
				.select({ visitId: visits.id })
				.from(visits)
				.where(and(eq(visits.marketEventId, event.id), eq(visits.status, 'registered')));

			await queueNotification(
				tx,
				registrations.map(({ visitId }) => visitId),
				'registration_closed',
				'registration_closed',
			);
		});
	}

	await deliverQueuedNotifications({ limit: 250 });
};

export const config: Config = { schedule: '* * * * *' };
