import type { GuestRecordTotals, GuestSummary } from '../../services/admin-api';
import { busyQueue } from './queueGuests.fixture';
import type { QueueGuest } from './types';

/**
 * Sample guest database rows for the admin stories: the queue fixture's people, each with a
 * record behind them. Invented, like the queue fixture itself.
 */

const noHistory: GuestRecordTotals = {
	visitCount: 0,
	servedCount: 0,
	noShowCount: 0,
	lastVisitDate: null,
	noteCount: 0,
	latestNoteCategory: null,
};

/**
 * A queue guest as the guest database lists them: their visit is their latest. The queue fixture's
 * guests share one guest record, so each gets its own here, as every row of the database is a guest.
 */
export function guestSummary(
	guest: QueueGuest,
	totals: Partial<GuestRecordTotals> = {},
	marketEventId: string | null = 'story-session',
): GuestSummary {
	return {
		...guest,
		guestId: `record-${guest.id}`,
		marketEventId,
		...noHistory,
		visitCount: 1,
		lastVisitDate: '2026-11-26',
		...totals,
	};
}

/** Someone on record who has never had a visit. */
export const unvisitedGuest: GuestSummary = {
	id: null,
	guestId: 'guest-without-visit',
	firstName: 'Ana',
	lastName: 'Reyes',
	pronunciation: null,
	phone: '(555) 987-6543',
	locale: 'tl',
	householdSize: null,
	queuePosition: null,
	priorityNumber: null,
	queueFront: null,
	queueOrder: null,
	calledAt: null,
	status: null,
	track: null,
	marketEventId: null,
	...noHistory,
};

/** The queue fixture's guests with varied histories; the second has a note flagged for a lead. */
export const guestDatabase: GuestSummary[] = busyQueue.map((guest, index) =>
	guestSummary(guest, {
		visitCount: 1 + ((index * 3) % 9),
		servedCount: (index * 3) % 9,
		lastVisitDate: index % 3 === 0 ? '2026-11-26' : '2026-11-19',
		...(index === 1 ? { noteCount: 2, latestNoteCategory: 'Escalate to Lead' } : {}),
	}),
);
