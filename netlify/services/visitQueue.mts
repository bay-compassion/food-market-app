import { and, asc, eq, inArray, isNotNull, sql } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { visits } from '../../db/schema.mjs';
import type { QueuePlacement } from '../../src/services/guestAdmission.js';
import {
	canRunVisitCommand,
	outstandingVisitStatuses,
	visitCommandTarget,
	type VisitCommand,
} from '../../src/services/visitStateMachine.js';
import { deliverQueuedNotifications, requeueNotification } from './notifications.mjs';
import { notificationsEnabled } from './pushNotifications.mjs';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type VisitCommandResult =
	| { ok: true; visit: { id: string; status: string } }
	| { ok: false; status: number; error: string };

/**
 * Queues a `called` notification on every channel for each visit, replacing any earlier one so a
 * re-call notifies again. The unique `(visit_id, dedupe_key, channel)` index means a visit only
 * ever holds one `called` row per channel.
 */
async function queueCalledNotifications(tx: Transaction, visitIds: string[]) {
	if (!visitIds.length || !notificationsEnabled()) {
		return;
	}
	await requeueNotification(tx, visitIds, 'called', 'called');
}

async function deliverCalledNotifications(visitIds: string[]) {
	if (!visitIds.length || !notificationsEnabled()) {
		return;
	}
	await deliverQueuedNotifications({ visitIds, types: ['called'], limit: visitIds.length });
}

/**
 * The columns a command writes besides the new status. `called_at` and `served_at` are the two
 * timestamps reporting measures wait time from, so a transition that undoes a call has to clear
 * the one it set. Nothing transitions out of `served`, so `served_at` is only ever written once.
 */
function visitCommandChanges(command: VisitCommand) {
	const status = visitCommandTarget(command);

	switch (command) {
		case 'call':
			return { status, calledAt: new Date() };
		case 'return_to_queue':
			return { status, calledAt: null };
		case 'serve':
			return { status, servedAt: new Date() };
		default:
			return { status };
	}
}

/**
 * Applies a single visit transition, rejecting anything the state machine disallows. The update
 * re-checks the source status in its `WHERE`, so two workers acting on the same visit at once
 * cannot both succeed — the loser gets the same 409 as an illegal transition.
 */
export async function runVisitCommand(
	visitId: string,
	command: VisitCommand,
): Promise<VisitCommandResult> {
	const [current] = await db
		.select({ status: visits.status })
		.from(visits)
		.where(eq(visits.id, visitId))
		.limit(1);

	if (!current) {
		return { ok: false, status: 404, error: 'Visit not found.' };
	}

	if (!canRunVisitCommand(current.status, command)) {
		return {
			ok: false,
			status: 409,
			error: 'That visit transition is not allowed from the current status.',
		};
	}

	const changes = visitCommandChanges(command);

	const updated = await db.transaction(async (tx) => {
		const [visit] = await tx
			.update(visits)
			.set(changes)
			.where(and(eq(visits.id, visitId), eq(visits.status, current.status)))
			.returning({ id: visits.id, status: visits.status });

		if (visit && command === 'call') {
			await queueCalledNotifications(tx, [visit.id]);
		}

		return visit ?? null;
	});

	if (!updated) {
		return {
			ok: false,
			status: 409,
			error: 'That visit transition is not allowed from the current status.',
		};
	}

	if (command === 'call') {
		await deliverCalledNotifications([updated.id]);
	}

	return { ok: true, visit: updated };
}

/**
 * Calls the next `count` waiting guests in queue order. The selection and the update happen in one
 * statement so two workers calling at the same moment cannot claim the same guests.
 */
export async function callNextVisits(marketEventId: string, count: number) {
	const called = await db.transaction(async (tx) => {
		const rows = await tx
			.update(visits)
			.set({ status: 'called', calledAt: sql`now()` })
			.where(
				inArray(
					visits.id,
					tx
						.select({ id: visits.id })
						.from(visits)
						.where(and(eq(visits.marketEventId, marketEventId), eq(visits.status, 'waiting')))
						.orderBy(sql`${visits.queuePosition} ASC NULLS LAST`, asc(visits.createdAt))
						.limit(count),
				),
			)
			.returning({ id: visits.id });
		const visitIds = rows.map((row) => row.id);

		await queueCalledNotifications(tx, visitIds);

		return visitIds;
	});

	await deliverCalledNotifications(called);

	return called;
}

/**
 * Marks everyone still waiting or called as a no-show. Runs inside `closeSession`'s transaction so
 * ending a session never strands a guest in a status that implies service is still coming.
 */
export async function resolveOutstandingVisits(tx: Transaction, marketEventId: string) {
	const resolved = await tx
		.update(visits)
		.set({ status: 'no_show' })
		.where(
			and(
				eq(visits.marketEventId, marketEventId),
				inArray(visits.status, outstandingVisitStatuses),
			),
		)
		.returning({ id: visits.id });

	return resolved.length;
}

/**
 * Picks the queue position for a guest added during service. `end` appends after everyone;
 * `next` puts them at the front of the waiting guests and shifts those down by one.
 *
 * Positions are display ordering, not a key — there is no unique constraint on
 * `(market_event_id, queue_position)` — so shifting is safe.
 */
export async function nextQueuePosition(
	tx: Transaction,
	marketEventId: string,
	placement: QueuePlacement,
) {
	const [highest] = await tx
		.select({ position: sql<number | null>`max(${visits.queuePosition})` })
		.from(visits)
		.where(eq(visits.marketEventId, marketEventId));
	const endPosition = (highest?.position ?? 0) + 1;

	if (placement === 'end') {
		return endPosition;
	}

	const [front] = await tx
		.select({ position: visits.queuePosition })
		.from(visits)
		.where(
			and(
				eq(visits.marketEventId, marketEventId),
				eq(visits.status, 'waiting'),
				isNotNull(visits.queuePosition),
			),
		)
		.orderBy(asc(visits.queuePosition))
		.limit(1);

	if (front?.position === null || front?.position === undefined) {
		return endPosition;
	}

	await tx
		.update(visits)
		.set({ queuePosition: sql`${visits.queuePosition} + 1` })
		.where(
			and(
				eq(visits.marketEventId, marketEventId),
				eq(visits.status, 'waiting'),
				sql`${visits.queuePosition} >= ${front.position}`,
			),
		);

	return front.position;
}
