import { AsyncWorkloadsClient, type CustomAsyncWorkloadEvent } from '@netlify/async-workloads';

import type { NotificationType } from './pushNotifications.mjs';

export const notificationDispatchEventName = 'notification.dispatch';

export interface NotificationDispatchEvent extends CustomAsyncWorkloadEvent {
	eventName: typeof notificationDispatchEventName;
	eventData: {
		marketEventId: string;
		types: NotificationType[];
	};
}

/** Hands a committed set of durable delivery rows to the asynchronous dispatcher. */
export async function requestNotificationDispatch(
	eventData: NotificationDispatchEvent['eventData'],
) {
	const client = new AsyncWorkloadsClient<NotificationDispatchEvent>();
	const result = await client.send(notificationDispatchEventName, { data: eventData });

	if (result.sendStatus === 'failed') {
		throw new Error('The notification dispatch event could not be queued.');
	}

	return result.eventId;
}
