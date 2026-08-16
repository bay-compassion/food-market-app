import type { VisitStatus } from '../../services/visitStateMachine';
import type { QueueGuest } from './types';

/**
 * Sample queue guests for the admin stories.
 *
 * Shared by `QueueView` and `QueueGuestRow` so the two screens illustrate the same people, and
 * kept out of the story files themselves so neither has to redeclare them. The names are invented;
 * nothing here comes from real guest data.
 */

const baseGuest: QueueGuest = {
	id: 'guest-1',
	firstName: 'Maria',
	lastName: 'Santos',
	phone: '(555) 123-4567',
	householdSize: 4,
	locale: 'es',
	queuePosition: 1,
	calledAt: null,
	status: 'waiting',
};

export function queueGuest(overrides: Partial<QueueGuest> = {}): QueueGuest {
	return { ...baseGuest, ...overrides };
}

/** A guest in each status, for stories that want to show one row at a time. */
export function guestWithStatus(status: VisitStatus): QueueGuest {
	return queueGuest({
		id: `guest-${status}`,
		status,
		// Only a called guest has been called, and the waiting-time label reads from this.
		calledAt: status === 'called' ? new Date(Date.now() - 4 * 60_000).toISOString() : null,
		queuePosition: status === 'waiting' ? 3 : null,
	});
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
		calledAt: new Date(Date.now() - 30_000).toISOString(),
	}),
	queueGuest({
		id: 'guest-waiting-1',
		firstName: 'Linh',
		lastName: 'Nguyen',
		locale: 'vi',
		householdSize: 5,
		queuePosition: 3,
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

/** The status tallies the admin overview endpoint returns for `busyQueue`. */
export const busyQueueCounts: Partial<Record<VisitStatus, number>> = {
	waiting: 3,
	called: 2,
	served: 1,
	no_show: 1,
};
