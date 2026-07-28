import { and, eq, inArray, lte } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { marketEvents, notificationDeliveries, visits } from '../../db/schema.js';
import {
	deliverPendingNotifications,
	notificationsEnabled,
} from '../services/pushNotifications.js';

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
		.select({ id: marketEvents.id })
		.from(marketEvents)
		.where(
			and(
				inArray(marketEvents.status, ['scheduled', 'registration_open']),
				lte(marketEvents.registrationClosesAt, now),
			),
		);
	for (const event of dueEvents) {
		await db.transaction(async (tx) => {
			const [closed] = await tx
				.update(marketEvents)
				.set({ status: 'registration_closed' })
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
			if (registrations.length) {
				await tx
					.insert(notificationDeliveries)
					.values(
						registrations.map(({ visitId }) => ({
							visitId,
							type: 'registration_closed',
							dedupeKey: 'registration_closed',
						})),
					)
					.onConflictDoNothing();
			}
		});
	}

	await deliverPendingNotifications({ limit: 250 });
};

export const config = { schedule: '* * * * *' };
