import type { QueueGuest } from './types';

/**
 * Sample queue guests for the admin stories.
 *
 * Shared by the queue desk's and the dashboard's stories, so the screens illustrate the same
 * people, and kept out of the story files themselves so none has to redeclare them. The names are
 * invented; nothing here comes from real guest data.
 */

const baseGuest: QueueGuest = {
	id: 'guest-1',
	guestId: 'guest-record-1',
	firstName: 'Maria',
	lastName: 'Santos',
	pronunciation: null,
	staffNotes: null,
	phone: '(555) 123-4567',
	householdSize: 4,
	locale: 'es',
	queuePosition: 1,
	priorityNumber: null,
	queueFront: false,
	queueOrder: 1,
	calledAt: null,
	status: 'waiting',
};

export function queueGuest(overrides: Partial<QueueGuest> = {}): QueueGuest {
	return { ...baseGuest, ...overrides };
}

/** A queue mid-service: some guests called, more waiting, a few already resolved. */
export const busyQueue: QueueGuest[] = [
	queueGuest({
		id: 'guest-called-1',
		firstName: 'Maria',
		lastName: 'Santos',
		locale: 'es',
		status: 'called',
		queuePosition: null,
		priorityNumber: null,
		queueFront: false,
		queueOrder: null,
		calledAt: new Date(Date.now() - 9 * 60_000).toISOString(),
	}),
	queueGuest({
		id: 'guest-called-2',
		firstName: 'Sohrab',
		lastName: 'Ahmadi',
		locale: 'fa',
		householdSize: 2,
		status: 'called',
		queuePosition: null,
		priorityNumber: null,
		queueFront: false,
		queueOrder: null,
		calledAt: new Date(Date.now() - 30_000).toISOString(),
	}),
	queueGuest({
		id: 'guest-waiting-1',
		firstName: 'Linh',
		lastName: 'Nguyen',
		locale: 'vi',
		householdSize: 5,
		queuePosition: 3,
		priorityNumber: null,
		queueFront: false,
		queueOrder: 3,
	}),
	queueGuest({
		id: 'guest-waiting-2',
		firstName: 'Rosa',
		lastName: 'Delacruz',
		locale: 'tl',
		householdSize: 1,
		queuePosition: 4,
	}),
	queueGuest({
		id: 'guest-waiting-3',
		firstName: 'Wei',
		lastName: 'Chen',
		locale: 'zh',
		householdSize: 3,
		queuePosition: 5,
	}),
	queueGuest({
		id: 'guest-served-1',
		firstName: 'James',
		lastName: 'Okafor',
		locale: 'en',
		householdSize: 2,
		status: 'served',
		queuePosition: null,
	}),
	queueGuest({
		id: 'guest-no-show-1',
		firstName: 'Amira',
		lastName: 'Haddad',
		locale: 'ar',
		householdSize: 6,
		status: 'no_show',
		queuePosition: null,
	}),
];

/** The end of a service: the same people, all of them finished one way or another. */
export const finishedQueue: QueueGuest[] = busyQueue.map((guest, index) =>
	queueGuest({
		...guest,
		// Most were served; the last is the one who never came back to the entrance.
		status: index === busyQueue.length - 1 ? 'no_show' : 'served',
		queuePosition: null,
		calledAt: null,
	}),
);
