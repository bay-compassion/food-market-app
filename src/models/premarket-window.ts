import type { SessionStatus } from '../services/sessionStateMachine.ts';
import type { MarketLocation } from './market-location.ts';
import { SessionTimeline, type SessionTiming } from './session-timeline.ts';

/**
 * When a volunteer may register for a session's premarket: on the market's own day, from midnight
 * until the lottery draws.
 *
 * The day matters because a session is `scheduled` all week. Without it, a photo of the printed
 * code would work days early. The draw is the end because a premarket place is taken outside the
 * draw: converting a lottery entry after the pool is frozen would race it.
 *
 * Reads the date in the location's time zone, so this uses Luxon through `MarketLocation` and is
 * for the server only — never the guest's first screen.
 */
export class PremarketWindow {
	private static readonly openStatuses: readonly SessionStatus[] = [
		'scheduled',
		'registration_open',
		'registration_closed',
		'lottery_pending',
	];

	constructor(
		private readonly session: SessionTiming,
		private readonly location: MarketLocation,
	) {}

	/** The market's day: the local date registration opens on. */
	get marketDate(): string {
		return this.location.localDateOf(this.session.registrationOpensAt);
	}

	/** Whether a volunteer may register for the premarket at `now`. */
	isOpenAt(now: Date): boolean {
		const status = new SessionTimeline(this.session).statusAt(now);

		return (
			PremarketWindow.openStatuses.includes(status) &&
			this.location.localDateOf(now) === this.marketDate
		);
	}
}
