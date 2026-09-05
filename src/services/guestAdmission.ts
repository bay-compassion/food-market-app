import type { SessionStatus } from './sessionStateMachine';
import type { VisitStatus } from './visitStateMachine';

/**
 * How a worker-added guest joins a session.
 *
 * - `lottery` — the guest takes their chances in the draw, exactly as if they had registered on
 *   their own phone. Only meaningful before the lottery has run.
 * - `queue` — the guest skips the draw and is placed straight into the waiting line. Before the
 *   lottery this reserves them a spot; during service it is how walk-ins have always been added.
 * - `served` — a record-keeping entry for someone who was already handed food outside the app.
 *   Only offered once the session has ended.
 */
export type GuestAdmission = 'lottery' | 'queue' | 'served';

/** Where in the waiting line a `queue` admission lands. */
export type QueuePlacement = 'next' | 'end';

export const guestAdmissions: GuestAdmission[] = ['lottery', 'queue', 'served'];

/**
 * Which admissions a session accepts, by how far it has progressed. The lottery stops being an
 * option once it has run, and a finished session only accepts after-the-fact records.
 */
const admissionsByStatus: Record<SessionStatus, GuestAdmission[]> = {
	draft: ['lottery', 'queue'],
	scheduled: ['lottery', 'queue'],
	registration_open: ['lottery', 'queue'],
	registration_closed: ['lottery', 'queue'],
	lottery_pending: ['queue'],
	service_started: ['queue'],
	ended: ['served'],
};

const visitStatusByAdmission: Record<GuestAdmission, VisitStatus> = {
	lottery: 'registered',
	queue: 'waiting',
	served: 'served',
};

export function admissionsFor(status: SessionStatus) {
	return admissionsByStatus[status];
}

export function canAdmitGuest(status: SessionStatus, admission: GuestAdmission) {
	return admissionsByStatus[status].includes(admission);
}

/** The status the new visit is created with. */
export function admissionVisitStatus(admission: GuestAdmission): VisitStatus {
	return visitStatusByAdmission[admission];
}

/** Only a `queue` admission takes a place in line; the others are ordered later or not at all. */
export function admissionNeedsQueuePosition(admission: GuestAdmission) {
	return admission === 'queue';
}

/** Draw odds only mean anything for a guest actually going into the draw. */
export function admissionTakesLotteryWeight(admission: GuestAdmission) {
	return admission === 'lottery';
}

export function isGuestAdmission(value: unknown): value is GuestAdmission {
	return guestAdmissions.some((admission) => admission === value);
}
