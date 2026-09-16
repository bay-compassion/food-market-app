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
export function admissionTakesLotteryWeight(admission: ManualAdmission) {
	return admission === 'lottery';
}

/**
 * What a worker can do when adding a guest by hand: admit them to the session in one of the
 * `GuestAdmission` ways, or — at any time, with or without a session — save only their details,
 * which creates the guest with no visit at all.
 */
export type ManualAdmission = GuestAdmission | 'profile';

/**
 * The choices the manual guest form offers. Saving details only is always available and always
 * last, so a session's own admissions stay the default; with no session it is the only choice.
 */
export function manualAdmissionsFor(status: SessionStatus | null): ManualAdmission[] {
	return status ? [...admissionsFor(status), 'profile'] : ['profile'];
}

/** Whether the add creates a visit, rather than only the guest's details. */
export function admissionCreatesVisit(admission: ManualAdmission): admission is GuestAdmission {
	return admission !== 'profile';
}

/**
 * Whether the worker is offered a QR code that puts the new record on the guest's phone. A `served`
 * record is written after the fact, when the guest is no longer at the table to scan it.
 */
export function admissionOffersPhoneClaim(admission: ManualAdmission) {
	return admission !== 'served';
}

export function isGuestAdmission(value: unknown): value is GuestAdmission {
	return guestAdmissions.some((admission) => admission === value);
}
