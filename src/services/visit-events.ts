import type { QueuePlacement } from './guestAdmission.ts';
import type { VisitCommand, VisitStatus } from './visitStateMachine.ts';

/**
 * What happened to a visit. Shared by the server, which records one in the same transaction as
 * every status change, and the volunteer screen's History panel, which lists them.
 */
export type VisitEventKind =
	/** The guest registered for the session themselves. */
	| 'registered'
	/** A worker added the guest by hand. */
	| 'added'
	/** The lottery drew the guest and gave them a place in line. */
	| 'drawn'
	/** The lottery did not draw the guest. */
	| 'not_drawn'
	| 'called'
	| 'served'
	| 'no_show'
	/** Put back in line after a no-show or a call made by mistake. */
	| 'returned'
	/** Cancelled by the guest, or because the session ended with them still in line. */
	| 'cancelled';

export const visitEventKinds: VisitEventKind[] = [
	'registered',
	'added',
	'drawn',
	'not_drawn',
	'called',
	'served',
	'no_show',
	'returned',
	'cancelled',
];

export function isVisitEventKind(value: unknown): value is VisitEventKind {
	return visitEventKinds.some((kind) => kind === value);
}

/**
 * Who made the change. A worker is named as they were at the time, from their verified sign-in;
 * either part can be missing, for a token issued before names were added to it.
 */
export type VisitEventActor =
	| { kind: 'guest' }
	| { kind: 'system' }
	| { kind: 'worker'; id: string | null; name: string | null };

/** The particulars an event can carry; which apply depends on its kind. */
export type VisitEventDetails = {
	/** Where a returned guest was put back in line. */
	placement?: QueuePlacement;
	/** The place in line a guest was given. */
	queuePosition?: number;
	/** Why a visit was cancelled without anyone cancelling it. */
	cause?: 'session_ended';
};

/** One entry in a visit's history, as `GET /api/admin/visits/:id/events` returns it. */
export type VisitEvent = {
	id: string;
	kind: VisitEventKind;
	/** The status the visit moved to. */
	toStatus: VisitStatus;
	actor: VisitEventActor;
	details: VisitEventDetails;
	/** ISO timestamp. */
	createdAt: string;
};

/** The event each worker command records. */
export const visitCommandEvents: Partial<Record<VisitCommand, VisitEventKind>> = {
	call: 'called',
	serve: 'served',
	mark_no_show: 'no_show',
	return_to_queue: 'returned',
};
