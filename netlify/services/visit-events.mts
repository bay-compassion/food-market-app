import { asc, eq } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { visitEvents, visits } from '../../db/schema.mjs';
import type {
	NameTagEventKind,
	VisitEvent,
	VisitEventActor,
	VisitEventDetails,
	VisitEventKind,
} from '../../src/services/visit-events.js';
import type { VisitStatus } from '../../src/services/visitStateMachine.js';
import { tracedQuery } from '../lib/sentry.mjs';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** An event to record: what happened to which visit, and who did it. */
export type NewVisitEvent = {
	visitId: string;
	kind: VisitEventKind;
	toStatus: VisitStatus;
	actor: VisitEventActor;
	details?: VisitEventDetails;
};

/** The guest, acting for themselves. */
export const guestActor: VisitEventActor = { kind: 'guest' };

/** The app acting on its own: the lottery draw, or a session ending. */
export const systemActor: VisitEventActor = { kind: 'system' };

/**
 * Records events inside the transaction that made the change they describe, so a status change
 * and its history entry land together or not at all. An empty list writes nothing.
 */
export async function recordVisitEvents(tx: Transaction, events: NewVisitEvent[]) {
	if (!events.length) {
		return;
	}

	await tx.insert(visitEvents).values(
		events.map(({ visitId, kind, toStatus, actor, details }) => ({
			visitId,
			kind,
			toStatus,
			actorKind: actor.kind,
			actorId: actor.kind === 'worker' ? actor.id : null,
			actorName: actor.kind === 'worker' ? actor.name : null,
			details: details ?? {},
		})),
	);
}

/**
 * Records that a visit's name tag was sent or printed, with the number the tag showed. It changes
 * no status, so the event carries the one the visit is in. A visit deleted since writes nothing.
 */
export async function recordNameTagEvent(
	kind: NameTagEventKind,
	tag: { visitId: string; queuePosition: number | null; priorityNumber: number | null },
	actor: VisitEventActor,
) {
	const details: VisitEventDetails = {};

	if (tag.queuePosition !== null) {
		details.queuePosition = tag.queuePosition;
	}

	if (tag.priorityNumber !== null) {
		details.priorityNumber = tag.priorityNumber;
	}

	await tracedQuery('visit_events.record_name_tag', () =>
		db.transaction(async (tx) => {
			const [visit] = await tx
				.select({ status: visits.status })
				.from(visits)
				.where(eq(visits.id, tag.visitId))
				.limit(1);

			if (visit) {
				await recordVisitEvents(tx, [
					{ visitId: tag.visitId, kind, toStatus: visit.status, actor, details },
				]);
			}
		}),
	);
}

/** A visit's history, oldest first. */
export async function listVisitEvents(visitId: string): Promise<VisitEvent[]> {
	const rows = await tracedQuery('visit_events.list', () =>
		db
			.select()
			.from(visitEvents)
			.where(eq(visitEvents.visitId, visitId))
			.orderBy(asc(visitEvents.createdAt), asc(visitEvents.id)),
	);

	return rows.map((row) => ({
		id: row.id,
		kind: row.kind,
		toStatus: row.toStatus,
		actor:
			row.actorKind === 'worker'
				? { kind: 'worker', id: row.actorId, name: row.actorName }
				: { kind: row.actorKind },
		details: row.details,
		createdAt: row.createdAt.toISOString(),
	}));
}
