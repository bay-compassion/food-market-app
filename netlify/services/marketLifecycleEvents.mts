import { AsyncWorkloadsClient, type CustomAsyncWorkloadEvent } from '@netlify/async-workloads';

export const registrationCloseEventName = 'market.registration-close';

export interface RegistrationCloseEvent extends CustomAsyncWorkloadEvent {
	eventName: typeof registrationCloseEventName;
	eventData: {
		marketEventId: string;
		expectedRegistrationClosesAt: string;
	};
}

/** Schedules the time-based transition; an outdated event is rejected by the workload handler. */
export async function scheduleRegistrationClose(event: { id: string; registrationClosesAt: Date }) {
	const client = new AsyncWorkloadsClient<RegistrationCloseEvent>();
	const result = await client.send(registrationCloseEventName, {
		data: {
			marketEventId: event.id,
			expectedRegistrationClosesAt: event.registrationClosesAt.toISOString(),
		},
		delayUntil: event.registrationClosesAt.valueOf(),
	});

	if (result.sendStatus === 'failed') {
		throw new Error('The registration-close event could not be scheduled.');
	}

	return result.eventId;
}
