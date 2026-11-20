import type { SessionStatus } from '../services/sessionStateMachine.ts';
import type { MarketLocation } from './market-location.ts';
import { SessionTimeline, type SessionTiming } from './session-timeline.ts';

/**
 * When a volunteer may check in for a session's premarket: on the market's own day, from midnight
 * until the session ends. Premarket shopping usually happens after the draw, before guests start.
 *
 * The day matters because a session is `scheduled` all week: the premarket is a record of who shopped
 * on market day, not a sign-up ahead of it.
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
		'service_started',
	];

	constructor(
		private readonly session: SessionTiming,
		private readonly location: MarketLocation,
	) {}

	/** The market's day: the local date registration opens on. */
	get marketDate(): string {
		return this.location.localDateOf(this.session.registrationOpensAt);
	}

	/** Whether a volunteer may check in for the premarket at `now`. */
	isOpenAt(now: Date): boolean {
		const status = new SessionTimeline(this.session).statusAt(now);

		return (
			PremarketWindow.openStatuses.includes(status) &&
			this.location.localDateOf(now) === this.marketDate
		);
	}
}
