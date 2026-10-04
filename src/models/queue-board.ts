import type { SessionStatus } from '../services/sessionStateMachine.ts';

/** What `GET /api/admin/kiosk` returns: the session's queue as a room display shows it. */
export type QueueBoardState = {
	/** The current session's status, or `null` when no session is configured. */
	sessionStatus: SessionStatus | null;
	/** The queue number most recently called, or `null` before anyone has been called. */
	nowCalling: number | null;
	/** Every number called but not yet served or marked a no-show, in queue order. */
	called: number[];
	/** How many guests are still in line, not yet called. */
	waitingCount: number;
};

/** Which screen the room display shows. */
export type QueueBoardPhase = 'not_started' | 'calling' | 'ended';

/**
 * The queue as a DMV-style room display presents it: one number being called now, and the numbers
 * called before it that nobody has come up for yet.
 *
 * Built from the wire state rather than owning it, and free of MobX and the DOM, so the server
 * and the kiosk read the same rules.
 */
export class QueueBoard {
	constructor(private readonly state: QueueBoardState) {}

	get phase(): QueueBoardPhase {
		switch (this.state.sessionStatus) {
			case 'service_started':
				return 'calling';
			case 'ended':
				return 'ended';
			default:
				return 'not_started';
		}
	}

	get nowCalling(): number | null {
		return this.state.nowCalling;
	}

	/**
	 * Numbers called earlier that still have not come to the table. The number on the main board
	 * is left out — it was only just called, and repeating it beside itself reads as a mistake.
	 */
	get stillWaitingFor(): number[] {
		return this.state.called.filter((position) => position !== this.state.nowCalling);
	}

	get waitingCount(): number {
		return this.state.waitingCount;
	}
}
