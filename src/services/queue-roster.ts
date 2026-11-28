import { LineOrder } from '../models/line-order.ts';
import { QueueNumber } from '../models/queue-number.ts';
import type { QueueGuest } from './admin-api.ts';
import { finishedVisitStatuses } from './visitStateMachine.ts';

/**
 * One session's guests, grouped the way the queue screen works through them.
 *
 * Built from the guest list rather than holding it: the list is polled every few seconds, so a
 * long-lived instance would hand `observer()` components a stale answer.
 */
export class QueueRoster {
	constructor(private readonly guests: readonly QueueGuest[]) {}

	/** The main line's guests: standby keeps a list of its own, in `standby`. */
	private get line(): QueueGuest[] {
		return this.guests.filter((guest) => guest.track !== 'postmarket');
	}

	/** At the entrance, longest-called first — the order a worker should get to them in. */
	get called(): QueueGuest[] {
		return this.line
			.filter((guest) => guest.status === 'called')
			.sort((first, second) => (first.calledAt ?? '').localeCompare(second.calledAt ?? ''));
	}

	/**
	 * The guest called last — the one the line is currently waiting on. Anyone called before them
	 * who is still `called` is a late arrival, served when they turn up rather than in turn.
	 */
	get mostRecentlyCalled(): QueueGuest | null {
		return this.called.at(-1) ?? null;
	}

	/** Still in line, in the order they will be called. */
	get waiting(): QueueGuest[] {
		return this.line.filter((guest) => guest.status === 'waiting').sort(LineOrder.compare);
	}

	/**
	 * On standby and not yet through: waiting on the list, or admitted and on their way to the
	 * desk — in S order, the order they joined and are admitted in.
	 */
	get standby(): QueueGuest[] {
		return this.guests
			.filter(
				(guest) =>
					guest.track === 'postmarket' && (guest.status === 'waiting' || guest.status === 'called'),
			)
			.sort((first, second) => (first.standbyNumber ?? 0) - (second.standbyNumber ?? 0));
	}

	/**
	 * Called but never came to the table. In effect they have gone to the back of the line: a
	 * worker can return one to the queue if they turn up, at their own discretion.
	 */
	get noShows(): QueueGuest[] {
		return this.guests.filter((guest) => guest.status === 'no_show');
	}

	/** Entered the lottery and were not drawn. Kept apart from those served — they never had a turn. */
	get notPlaced(): QueueGuest[] {
		return this.guests.filter((guest) => guest.status === 'not_placed');
	}

	/**
	 * Through for the day: served, or cancelled by themselves, a worker, or the session ending — in
	 * ticket number order (main, then P, then S), with any guest who never had a number last.
	 * Premarket volunteers are listed apart, in `premarket`: they were never in the line.
	 */
	get done(): QueueGuest[] {
		return this.guests
			.filter(
				(guest) =>
					guest.track !== 'premarket' &&
					(guest.status === 'served' || guest.status === 'cancelled'),
			)
			.sort(QueueRoster.byNumber);
	}

	/** Volunteers who shopped before the line, by name: they have no number to order them by. */
	get premarket(): QueueGuest[] {
		return this.guests
			.filter((guest) => guest.track === 'premarket')
			.sort(
				(first, second) =>
					first.lastName.localeCompare(second.lastName) ||
					first.firstName.localeCompare(second.firstName),
			);
	}

	/** Main numbers, then the priority series, then guests without a number. */
	private static byNumber(this: void, first: QueueGuest, second: QueueGuest): number {
		const [firstNumber, secondNumber] = [QueueNumber.of(first), QueueNumber.of(second)];

		if (firstNumber && secondNumber) {
			return QueueNumber.compare(firstNumber, secondNumber);
		}

		return Number(firstNumber === null) - Number(secondNumber === null);
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
