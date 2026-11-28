import type { QueuePlacement } from './guestAdmission.ts';
import type { VisitCommand, VisitStatus } from './visitStateMachine.ts';

/**
 * What happened to a visit. Shared by the server, which records one in the same transaction as
 * every status change, and the volunteer screen's History panel, which lists them. The name tag
 * events change no status; they keep a record of every tag sent and printed after the print
 * station's own list is gone.
 */
export type VisitEventKind =
	/** The guest registered for the session themselves. */
	| 'registered'
	/** A worker added the guest by hand. */
	| 'added'
	/**
	 * A volunteer checked in for the premarket — on their own phone or added by a worker, before
	 * the draw or after it, new or moved from a lottery entry.
	 */
	| 'premarket_check_in'
	/** The guest joined the standby list by scanning the session's code at the market. */
	| 'standby_joined'
	/** The lottery drew the guest and gave them a place in line. */
	| 'drawn'
	/** The lottery did not draw the guest. */
	| 'not_drawn'
	| 'called'
	| 'served'
	| 'no_show'
	/** Put back in line after a no-show or a call made by mistake. */
	| 'returned'
	/** Cancelled by the guest, or because the session ended before they were called. */
	| 'cancelled'
	/** A volunteer sent the guest's name tag to the print station. */
	| 'tag_sent'
	/** The print station printed the guest's name tag. */
	| 'tag_printed'
	/** Someone reconciling an ended session set the status the visit should have had. */
	| 'corrected';

export const visitEventKinds: VisitEventKind[] = [
	'registered',
	'added',
	'premarket_check_in',
	'standby_joined',
	'drawn',
	'not_drawn',
	'called',
	'served',
	'no_show',
	'returned',
	'cancelled',
	'tag_sent',
	'tag_printed',
	'corrected',
];

/** The events that record a name tag rather than a status change. */
export const nameTagEventKinds = ['tag_sent', 'tag_printed'] as const satisfies VisitEventKind[];

export type NameTagEventKind = (typeof nameTagEventKinds)[number];

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
	/** The main-series number a guest was given, or the one their name tag showed. */
	queuePosition?: number;
	/** The priority-series number (`P1`, …) a guest a worker put at the front was given. */
	priorityNumber?: number;
	/** The standby-series number (`S1`, …) a guest on standby was given. */
	standbyNumber?: number;
	/** Why a visit was cancelled or marked a no-show without anyone doing it. */
	cause?: 'session_ended';
	/** The status a `corrected` visit was in before the correction. */
	fromStatus?: VisitStatus;
};

/** One entry in a visit's history, as `GET /api/admin/visits/:id/events` returns it. */
export type VisitEvent = {
	id: string;
	kind: VisitEventKind;
	/** The status the visit moved to — or, for a name tag event, the status it was in. */
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
