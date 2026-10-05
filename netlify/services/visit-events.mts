import { asc, eq } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { visitEvents } from '../../db/schema.mjs';
import type {
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
