import type { QueueGuest } from '../services/admin-api.ts';
import type { VisitStatus } from '../services/visitStateMachine.ts';
import { VisitStatusCorrection } from './visit-status-correction.ts';

/**
 * Correcting several visits of an ended session to the same status at once, as a volunteer does
 * when a whole stretch of the line was recorded wrong on the day. Each visit is still corrected on
 * its own terms — `VisitStatusCorrection` decides what it may become — so a mixed selection offers
 * every status that at least one of them can move to, and leaves alone those already there.
 */
export class BulkStatusCorrection<Guest extends QueueGuest = QueueGuest> {
	constructor(private readonly guests: readonly Guest[]) {}

	get count(): number {
		return this.guests.length;
	}

	/** The statuses at least one selected visit can be corrected to, in the order they are offered. */
	get targets(): VisitStatus[] {
		return VisitStatusCorrection.targets.filter((to) => this.eligible(to).length > 0);
	}

	/** The selected visits a correction to `to` changes. */
	eligible(to: VisitStatus): Guest[] {
		return this.guests.filter((guest) => new VisitStatusCorrection(guest.status).allows(to));
	}

	/** The selected visits a correction to `to` leaves alone, because they are already there. */
	unchanged(to: VisitStatus): Guest[] {
		return this.guests.filter((guest) => !new VisitStatusCorrection(guest.status).allows(to));
	}
}
