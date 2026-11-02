import type { SessionStatus } from '../services/sessionStateMachine.ts';
import { SessionTimeline, type SessionTiming } from './session-timeline.ts';

/** The four things that happen to a session on market day, in the order they happen. */
export type MilestoneKind =
	| 'registration_opens'
	| 'registration_closes'
	| 'lottery_draw'
	| 'service_starts';

/** Where a milestone stands: behind the session, the one it is at or heading for, or still ahead. */
export type MilestoneState = 'done' | 'current' | 'upcoming';

export type SessionMilestone = {
	kind: MilestoneKind;
	state: MilestoneState;
	/** When it happens. Null for what has no set time: service, and a draw run by hand. */
	at: Date | null;
};

const order: MilestoneKind[] = [
	'registration_opens',
	'registration_closes',
	'lottery_draw',
	'service_starts',
];

/**
 * Which milestone each status is at or heading for. A closed registration is already heading for
 * the draw, since the grace period that separates them lasts only seconds. An ended session has
 * passed them all.
 */
const currentIndexByStatus: Record<SessionStatus, number> = {
	scheduled: 0,
	registration_open: 1,
	registration_closed: 2,
	lottery_pending: 2,
	service_started: 3,
	ended: order.length,
};

/**
 * One session's market day at a glance: what has happened, what happens next, and when.
 *
 * Built from a session row rather than holding one, and on top of `SessionTimeline`, which owns how
 * the draw time follows from the registration window. The server's own draw time wins when it sent
 * one, since a postponed draw is only known there.
 */
export class SessionMilestones {
	private readonly timeline: SessionTimeline;

	constructor(private readonly session: SessionTiming & { lotteryDrawsAt?: Date | null }) {
		this.timeline = new SessionTimeline(session);
	}

	/** When the draw runs on its own, or `null` when somebody has to run it. */
	get lotteryDrawsAt(): Date | null {
		return this.session.lotteryDrawsAt ?? this.timeline.lotteryDrawsAt;
	}

	/** When a closed registration stops accepting forms that were already being filled in. */
	get graceDeadline(): Date {
		return this.timeline.graceDeadline;
	}

	/** Every milestone in order. */
	get list(): SessionMilestone[] {
		const current = currentIndexByStatus[this.session.status];
		const times: Record<MilestoneKind, Date | null> = {
			registration_opens: this.session.registrationOpensAt,
			registration_closes: this.session.registrationClosesAt,
			lottery_draw: this.lotteryDrawsAt,
			service_starts: null,
		};

		return order.map((kind, index) => ({
			kind,
			state: index < current ? 'done' : index === current ? 'current' : 'upcoming',
			at: times[kind],
		}));
	}
}
