import type { SessionStatus } from './sessionStateMachine';
import type { VisitTrack } from './visit-track';
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
 * - `premarket` — a volunteer shopping before the line opens: a guaranteed place, no number, and
 *   nothing taken from the line's capacity. Recorded as served the moment they are added, since a
 *   volunteer is added as they start shopping. Offered while the session runs, before and after the
 *   draw.
 * - `standby` — a guest on the standby list after the main line: an S number in the order they
 *   joined, no guarantee of food, and nothing taken from the line's capacity. Offered once the draw
 *   has run (see `docs/standby.md`).
 */
export type GuestAdmission = 'lottery' | 'queue' | 'served' | 'premarket' | 'standby';

/** Where in the waiting line a `queue` admission lands. */
export type QueuePlacement = 'next' | 'end';

export const guestAdmissions: GuestAdmission[] = [
	'lottery',
	'queue',
	'served',
	'premarket',
	'standby',
];

/**
 * Which admissions a session accepts, by how far it has progressed. The lottery stops being an
 * option once it has run, and a finished session only accepts after-the-fact records.
 */
const admissionsByStatus: Record<SessionStatus, GuestAdmission[]> = {
	scheduled: ['lottery', 'queue', 'premarket'],
	registration_open: ['lottery', 'queue', 'premarket'],
	registration_closed: ['lottery', 'queue', 'premarket'],
	lottery_pending: ['queue', 'premarket'],
	service_started: ['queue', 'standby', 'premarket'],
	ended: ['served'],
};

const visitStatusByAdmission: Record<GuestAdmission, VisitStatus> = {
	lottery: 'registered',
	queue: 'waiting',
	served: 'served',
	premarket: 'served',
	standby: 'waiting',
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

/** A `premarket` admission joins the premarket, `standby` the postmarket; the rest, the lottery's. */
export function admissionTrack(admission: GuestAdmission): VisitTrack {
	switch (admission) {
		case 'premarket':
			return 'premarket';
		case 'standby':
			return 'postmarket';
		default:
			return 'lottery';
	}
}

/** Only a `standby` admission takes an S number, the next in the session's standby series. */
export function admissionTakesStandbyNumber(admission: GuestAdmission) {
	return admission === 'standby';
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
 * record is written after the fact, when the guest is no longer at the table to scan it. A standby
 * guest's phone has no standby card to show yet (see `docs/standby.md`), so it isn't offered either.
 */
export function admissionOffersPhoneClaim(admission: ManualAdmission) {
	return admission !== 'served' && admission !== 'standby';
}

export function isGuestAdmission(value: unknown): value is GuestAdmission {
	return guestAdmissions.some((admission) => admission === value);
}
