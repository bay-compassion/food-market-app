import type { SessionStatus } from '../services/sessionStateMachine.ts';
import { QueueNumber } from './queue-number.ts';

/** What `GET /api/kiosk/board` returns: the session's queue as a room display shows it. */
export type QueueBoardState = {
	/** The current session's status, or `null` when no session is configured. */
	sessionStatus: SessionStatus | null;
	/** The highest main-series number called, or `null` before anyone has been called. */
	nowCalling: number | null;
	/** Every main number called but not yet served or marked a no-show, most recently called first. */
	called: number[];
	/**
	 * The same for the priority series (`P1`, …). A field of its own rather than a change to
	 * `called`, so a kiosk still running the previous build keeps reading plain numbers.
	 */
	calledPriority: number[];
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

	/**
	 * Whether nothing is going to change for a while: no session, one not yet open, or one over.
	 * A display can check in rarely then. Registration is not idle — guests' phones are reading
	 * the market anyway, and service can start at any moment.
	 */
	get isIdle(): boolean {
		const status = this.state.sessionStatus;

		return status === null || status === 'scheduled' || status === 'ended';
	}

	/**
	 * The number on the main board: the highest main number called. Until one has been, a priority
	 * number at the entrance stands in, so a session that starts with a guest put at the front does
	 * not show "no numbers called yet" while they are being called.
	 */
	get nowCalling(): QueueNumber | null {
		if (this.state.nowCalling !== null) {
			return QueueNumber.main(this.state.nowCalling);
		}

		const priority = this.state.calledPriority[0];

		return priority === undefined ? null : QueueNumber.priority(priority);
	}

	/**
	 * Numbers called earlier that still have not come to the table, most recently called first and
	 * the priority series after the main one. The number on the main board is left out — it was only
	 * just called, and repeating it beside itself reads as a mistake.
	 */
	get stillWaitingFor(): QueueNumber[] {
		const nowCalling = this.nowCalling;

		return [
			...this.state.called.map((value) => QueueNumber.main(value)),
			...this.state.calledPriority.map((value) => QueueNumber.priority(value)),
		].filter((number) => !number.equals(nowCalling));
	}

	get waitingCount(): number {
		return this.state.waitingCount;
	}
}
