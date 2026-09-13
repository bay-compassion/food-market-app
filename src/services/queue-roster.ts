import type { QueueGuest } from './admin-api.ts';
import { finishedVisitStatuses } from './visitStateMachine.ts';

function byQueuePosition(first: QueueGuest, second: QueueGuest) {
	return (
		(first.queuePosition ?? Number.MAX_SAFE_INTEGER) -
		(second.queuePosition ?? Number.MAX_SAFE_INTEGER)
	);
}

/**
 * One session's guests, grouped the way the queue screen works through them.
 *
 * Built from the guest list rather than holding it: the list is polled every few seconds, so a
 * long-lived instance would hand `observer()` components a stale answer.
 */
export class QueueRoster {
	constructor(private readonly guests: readonly QueueGuest[]) {}

	/** At the entrance, longest-called first — the order a worker should get to them in. */
	get called(): QueueGuest[] {
		return this.guests
			.filter((guest) => guest.status === 'called')
			.sort((first, second) => (first.calledAt ?? '').localeCompare(second.calledAt ?? ''));
	}

	/** Still in line, in the order the draw put them in. */
	get waiting(): QueueGuest[] {
		return this.guests.filter((guest) => guest.status === 'waiting').sort(byQueuePosition);
	}

	/** Done for the day, however they got there: served, skipped, a no show, or cancelled. */
	get finished(): QueueGuest[] {
		return this.guests.filter((guest) => finishedVisitStatuses.includes(guest.status));
	}

	/**
	 * Whether service has worked through everyone: every guest of the session is finished, so there
	 * is nobody left to call and closing the session is the only step left.
	 *
	 * An empty roster is deliberately *not* complete. The queue screen polls, and a session whose
	 * guests have not arrived yet looks exactly like a session whose guests are all gone — turning
	 * the primary control into a destructive one during that gap invites a mis-tap.
	 */
	get isComplete(): boolean {
		return this.guests.length > 0 && this.finished.length === this.guests.length;
	}
}
