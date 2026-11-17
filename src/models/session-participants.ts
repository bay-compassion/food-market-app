import type { QueueGuest } from '../services/admin-api.ts';
import {
	finishedVisitStatuses,
	visitStatuses,
	type VisitStatus,
} from '../services/visitStateMachine.ts';
import { QueueNumber } from './queue-number.ts';

export type ParticipantGroup<Guest extends QueueGuest = QueueGuest> = {
	status: VisitStatus;
	guests: Guest[];
};

/**
 * Everyone who took part in an ended session, grouped by how their visit finished, for reconciling
 * it against what happened on the day. The finished statuses come first, in the order the session
 * produces them; anything else — a visit a session somehow ended without resolving — follows, so it
 * still shows up to be corrected. Within a group, guests run in number order, priority numbers
 * first, and those without a number by last name.
 */
export class SessionParticipants<Guest extends QueueGuest = QueueGuest> {
	private static readonly statusOrder: VisitStatus[] = [
		...finishedVisitStatuses,
		...visitStatuses.filter((status) => !finishedVisitStatuses.includes(status)),
	];

	constructor(private readonly guests: readonly Guest[]) {}

	get count(): number {
		return this.guests.length;
	}

	/** Every status anyone is in, in display order; empty statuses are left out. */
	get groups(): ParticipantGroup<Guest>[] {
		return SessionParticipants.statusOrder
			.map((status) => ({
				status,
				guests: this.guests
					.filter((guest) => guest.status === status)
					.sort((a, b) => SessionParticipants.compare(a, b)),
			}))
			.filter((group) => group.guests.length > 0);
	}

	private static compare(a: QueueGuest, b: QueueGuest): number {
		return (
			SessionParticipants.numberRank(a) - SessionParticipants.numberRank(b) ||
			a.lastName.localeCompare(b.lastName) ||
			a.firstName.localeCompare(b.firstName)
		);
	}

	/** Priority numbers, then main numbers, then guests the session never gave a number. */
	private static numberRank(guest: QueueGuest): number {
		const number = QueueNumber.of(guest);

		if (!number) {
			return Number.MAX_SAFE_INTEGER;
		}

		return number.isPriority ? number.value : 1_000_000 + number.value;
	}
}
