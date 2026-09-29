import { AsyncWorkloadsClient, type CustomAsyncWorkloadEvent } from '@netlify/async-workloads';

import { notificationsEnabled, type NotificationType } from './pushNotifications.mjs';

export const notificationDispatchEventName = 'notification.dispatch';

export interface NotificationDispatchEvent extends CustomAsyncWorkloadEvent {
	eventName: typeof notificationDispatchEventName;
	eventData: {
		marketEventId: string;
		types: NotificationType[];
	};
}

/**
 * Hands a committed set of durable delivery rows to the asynchronous dispatcher. Does nothing, and
 * returns `null`, when notifications are disabled: no delivery rows are queued then, so there is
 * nothing to dispatch, and an environment without Netlify's event router (the queue end-to-end rig)
 * would otherwise fail the already-committed action that asked.
 */
export async function requestNotificationDispatch(
	eventData: NotificationDispatchEvent['eventData'],
) {
	if (!notificationsEnabled()) {
		return null;
	}

	const client = new AsyncWorkloadsClient<NotificationDispatchEvent>();
	const result = await client.send(notificationDispatchEventName, { data: eventData });

	if (result.sendStatus === 'failed') {
		throw new Error('The notification dispatch event could not be queued.');
	}

	return result.eventId;
}
