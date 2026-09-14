import {
	asyncWorkloadFn,
	type AsyncWorkloadConfig,
	type AsyncWorkloadEvent,
} from '@netlify/async-workloads';

import { reportedWorkload } from '../lib/sentry.mjs';
import {
	notificationDispatchEventName,
	type NotificationDispatchEvent,
} from '../services/notificationDispatch.mjs';
import { deliverQueuedNotifications } from '../services/notifications.mjs';

const batchSize = 50;

/**
 * One transition is one durable workflow. Each batch is a checkpoint, so Netlify can reinvoke the
 * workload between batches without repeating work that the preceding step completed.
 */
export async function dispatchNotifications({
	eventId,
	eventData,
	step,
}: AsyncWorkloadEvent<NotificationDispatchEvent>) {
	for (let batch = 0; ; batch += 1) {
		const result = await step.run(`deliver-batch-${batch}`, () =>
			deliverQueuedNotifications({ ...eventData, claimId: eventId, limit: batchSize }),
		);

		if (!result.hasMore) {
			return;
		}
	}
}

const handler: ReturnType<typeof asyncWorkloadFn<NotificationDispatchEvent>> =
	asyncWorkloadFn<NotificationDispatchEvent>(
		reportedWorkload('notification-dispatch', dispatchNotifications),
	);

export default handler;

export const asyncWorkloadConfig: AsyncWorkloadConfig<NotificationDispatchEvent> = {
	events: [notificationDispatchEventName],
	maxRetries: 4,
};
