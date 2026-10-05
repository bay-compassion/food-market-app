import type { VisitHistoryTranslation } from '../adminLocales.ts';
import type { VisitEvent } from '../services/visit-events.ts';

/**
 * One line of a visit's History panel: what happened, who did it, and when. A value object over
 * the recorded event, so the panel only lays it out.
 */
export class VisitHistoryEntry {
	constructor(
		private readonly event: VisitEvent,
		private readonly t: VisitHistoryTranslation,
	) {}

	get id(): string {
		return this.event.id;
	}

	get kind(): VisitEvent['kind'] {
		return this.event.kind;
	}

	/** "Called", or "Drawn in the lottery · #4", "Returned to queue · to the back". */
	get title(): string {
		const { kind, details } = this.event;
		const title = this.t.kinds[kind];

		if (kind === 'returned' && details.placement) {
			const where = details.placement === 'next' ? this.t.returnedToFront : this.t.returnedToBack;

			return `${title} · ${where}`;
		}

		if (kind === 'drawn' && details.queuePosition !== undefined) {
			return `${title} · #${details.queuePosition}`;
		}

		return title;
	}

	/** Who made the change. */
	get byline(): string {
		const { actor, kind, details } = this.event;

		switch (actor.kind) {
			case 'worker':
				return actor.name ? this.t.byWorker.replace('{name}', actor.name) : this.t.byUnnamedWorker;
			case 'guest':
				return this.t.byGuest;
			case 'system':
				if (kind === 'drawn' || kind === 'not_drawn') {
					return this.t.byLottery;
				}

				return details.cause === 'session_ended' ? this.t.bySessionEnding : this.t.bySystem;
		}
	}

	get at(): Date {
		return new Date(this.event.createdAt);
	}
}
