import {
	asyncWorkloadFn,
	type AsyncWorkloadConfig,
	type AsyncWorkloadEvent,
} from '@netlify/async-workloads';
import { eq } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { marketEvents } from '../../db/schema.mjs';
import { reportedWorkload } from '../lib/sentry.mjs';
import {
	registrationCloseEventName,
	type RegistrationCloseEvent,
} from '../services/marketLifecycleEvents.mjs';
import { getCurrentEvent } from '../services/marketSession.mjs';

/** Advances the session only when this event still describes its current registration window. */
export async function closeRegistrationOnSchedule({
	eventData,
}: AsyncWorkloadEvent<RegistrationCloseEvent>) {
	const [event] = await db
		.select({
			status: marketEvents.status,
			registrationClosesAt: marketEvents.registrationClosesAt,
		})
		.from(marketEvents)
		.where(eq(marketEvents.id, eventData.marketEventId))
		.limit(1);

	if (
		!event ||
		(event.status !== 'scheduled' && event.status !== 'registration_open') ||
		event.registrationClosesAt.toISOString() !== eventData.expectedRegistrationClosesAt
	) {
		return;
	}

	await getCurrentEvent();
}

const handler: ReturnType<typeof asyncWorkloadFn<RegistrationCloseEvent>> =
	asyncWorkloadFn<RegistrationCloseEvent>(
		reportedWorkload('market-registration-close', closeRegistrationOnSchedule),
	);

export default handler;

export const asyncWorkloadConfig: AsyncWorkloadConfig<RegistrationCloseEvent> = {
	events: [registrationCloseEventName],
	maxRetries: 4,
};
