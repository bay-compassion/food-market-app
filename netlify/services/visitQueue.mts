import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { marketEvents, visits } from '../../db/schema.mjs';
import { LineOrder } from '../../src/models/line-order.js';
import { QueueNumber } from '../../src/models/queue-number.js';
import type { QueuePlacement } from '../../src/services/guestAdmission.js';
import { visitCommandEvents, type VisitEventActor } from '../../src/services/visit-events.js';
import {
	canRunVisitCommand,
	outstandingVisitStatuses,
	visitCommandTarget,
	type VisitCommand,
	type VisitStatus,
} from '../../src/services/visitStateMachine.js';
import { tracedQuery } from '../lib/sentry.mjs';
import { deliverQueuedNotifications, requeueNotification } from './notifications.mjs';
import { notificationsEnabled } from './pushNotifications.mjs';
import { recordVisitEvents, systemActor } from './visit-events.mjs';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The order a session's line is called in — `LineOrder.compare`, as SQL. The trailing `created_at`
 * only breaks a tie no placement should produce.
 */
export const lineOrder = [
	desc(visits.queueFront),
	sql`${visits.queueOrder} ASC NULLS LAST`,
	asc(visits.createdAt),
] as const;

/** Visits a session's ending resolves: anyone the market still owes a draw or a turn. */
const stillInLineStatuses: VisitStatus[] = ['registered', ...outstandingVisitStatuses];

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

/** Thrown inside a command's transaction to roll it back when another worker got there first. */
class TransitionRefused extends Error {}

const transitionRefused: VisitCommandResult = {
	ok: false,
	status: 409,
	error: 'That visit transition is not allowed from the current status.',
};

export type VisitCommandOptions = {
	/** Who ran the command, for the visit's history. */
	actor: VisitEventActor;
	/**
	 * Where `return_to_queue` puts the guest: `end` behind everyone waiting, `next` at the front.
	 * Without one, the guest goes back to the place they had. Ignored by every other command.
	 */
	placement?: QueuePlacement;
};

/**
 * Applies a single visit transition, rejecting anything the state machine disallows. The update
 * re-checks the source status in its `WHERE`, so two workers acting on the same visit at once
 * cannot both succeed — the loser gets the same 409 as an illegal transition, and anything the
 * command did to make room in the line is rolled back with it.
 */
export async function runVisitCommand(
	visitId: string,
	command: VisitCommand,
	options: VisitCommandOptions,
): Promise<VisitCommandResult> {
	const [current] = await tracedQuery('visit.read_status', () =>
		db
			.select({
				status: visits.status,
				marketEventId: visits.marketEventId,
				queuePosition: visits.queuePosition,
				priorityNumber: visits.priorityNumber,
			})
			.from(visits)
			.where(eq(visits.id, visitId))
			.limit(1),
	);

	if (!current) {
		return { ok: false, status: 404, error: 'Visit not found.' };
	}

	if (!canRunVisitCommand(current.status, command)) {
		return transitionRefused;
	}

	const placement = command === 'return_to_queue' ? options.placement : undefined;

	let updated: { id: string; status: string };

	try {
		updated = await tracedQuery('visit.apply_command', () =>
			db.transaction(async (tx) => {
				// A returned guest keeps their number; only their place in the line moves.
				const slot = placement
					? await placeInLine(tx, current.marketEventId, placement, {
							id: visitId,
							held: QueueNumber.of(current),
						})
					: undefined;
				const changes =
					slot === undefined
						? visitCommandChanges(command)
						: { ...visitCommandChanges(command), ...slot };
				const [visit] = await tx
					.update(visits)
					.set(changes)
					.where(and(eq(visits.id, visitId), eq(visits.status, current.status)))
					.returning({ id: visits.id, status: visits.status });

				if (!visit) {
					throw new TransitionRefused();
				}

				const kind = visitCommandEvents[command];

				if (kind) {
					await recordVisitEvents(tx, [
						{
							visitId: visit.id,
							kind,
							toStatus: visit.status,
							actor: options.actor,
							details: placement ? { placement } : undefined,
						},
					]);
				}

				if (command === 'call') {
					await queueCalledNotifications(tx, [visit.id]);
				}

				return visit;
			}),
		);
	} catch (error) {
		if (error instanceof TransitionRefused) {
			return transitionRefused;
		}

		throw error;
	}

	if (command === 'call') {
		await deliverCalledNotifications([updated.id]);
	}

	return { ok: true, visit: updated };
}

/**
 * Moves the next `count` waiting guests to `called` inside `tx`, in queue order, and queues their
 * notifications. The selection and the update are one statement so two workers calling at the same
 * moment cannot claim the same guests.
 */
async function callNextInTransaction(
	tx: Transaction,
	marketEventId: string,
	count: number,
	actor: VisitEventActor,
) {
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
					.orderBy(...lineOrder)
					.limit(count),
			),
		)
		.returning({ id: visits.id });
	const visitIds = rows.map((row) => row.id);

	await recordVisitEvents(
		tx,
		visitIds.map((visitId) => ({ visitId, kind: 'called', toStatus: 'called', actor })),
	);
	await queueCalledNotifications(tx, visitIds);

	return visitIds;
}

/** Calls the next `count` waiting guests in queue order. */
export async function callNextVisits(marketEventId: string, count: number, actor: VisitEventActor) {
	const called = await tracedQuery('visit.call_next', () =>
		db.transaction((tx) => callNextInTransaction(tx, marketEventId, count, actor)),
	);

	await deliverCalledNotifications(called);

	return called;
}

export type ServeAndCallNextResult =
	| { ok: true; served: string; called: string[] }
	| { ok: false; status: number; error: string };

/**
 * Serves a called guest and calls the next one in line, as one transaction — the step a worker at
 * the entrance repeats all day.
 *
 * The serve only applies to a visit of this session that is still `called`, so a guest another
 * worker has already finished is refused rather than served twice, and in that case nobody is
 * called either: the worker is looking at a stale ticket, and calling someone on the strength of
 * it would surprise them. With nobody left waiting, the guest is still served and `called` is
 * empty.
 */
export async function serveAndCallNext(
	marketEventId: string,
	visitId: string,
	actor: VisitEventActor,
): Promise<ServeAndCallNextResult> {
	const result = await tracedQuery('visit.serve_and_call_next', () =>
		db.transaction(async (tx) => {
			const [served] = await tx
				.update(visits)
				.set(visitCommandChanges('serve'))
				.where(
					and(
						eq(visits.id, visitId),
						eq(visits.marketEventId, marketEventId),
						eq(visits.status, 'called'),
					),
				)
				.returning({ id: visits.id });

			if (!served) {
				return null;
			}

			await recordVisitEvents(tx, [
				{ visitId: served.id, kind: 'served', toStatus: 'served', actor },
			]);

			return {
				served: served.id,
				called: await callNextInTransaction(tx, marketEventId, 1, actor),
			};
		}),
	);

	if (!result) {
		return { ok: false, status: 409, error: 'That guest is no longer waiting to be served.' };
	}

	await deliverCalledNotifications(result.called);

	return { ok: true, ...result };
}

/**
 * Cancels every visit still in line — registered, waiting, or called — when a session ends. Runs
 * inside `endSession`'s transaction so ending a session never strands a guest in a status that
 * implies service is still coming. It is `cancelled` rather than `no_show` because the market ended
 * the visit, not the guest: a no-show is only ever recorded by a worker.
 */
export async function resolveOutstandingVisits(tx: Transaction, marketEventId: string) {
	return tracedQuery('visit.resolve_outstanding', async () => {
		const resolved = await tx
			.update(visits)
			.set({ status: 'cancelled' })
			.where(
				and(eq(visits.marketEventId, marketEventId), inArray(visits.status, stillInLineStatuses)),
			)
			.returning({ id: visits.id });

		await recordVisitEvents(
			tx,
			resolved.map(({ id }) => ({
				visitId: id,
				kind: 'cancelled',
				toStatus: 'cancelled',
				actor: systemActor,
				details: { cause: 'session_ended' },
			})),
		);

		return resolved.length;
	});
}

/**
 * Places a guest in the session's line — a new one a worker is adding, or one being returned to the
 * queue, who keeps the number they `hold` — and returns the columns to write. The rules are
 * `LineOrder`'s; this reads the line they need.
 *
 * Locks the session row first, so two workers placing guests at once cannot both read the same
 * highest number and hand it out twice. Nothing else moves: a number, once given, never changes.
 */
export async function placeInLine(
	tx: Transaction,
	marketEventId: string,
	placement: QueuePlacement,
	visit: { id: string; held: QueueNumber | null } | null = null,
) {
	return tracedQuery('visit.place_in_line', async () => {
		await tx
			.select({ id: marketEvents.id })
			.from(marketEvents)
			.where(eq(marketEvents.id, marketEventId))
			.for('update');

		const othersWaiting = visit
			? sql`${visits.status} = 'waiting' AND ${visits.id} <> ${visit.id}`
			: sql`${visits.status} = 'waiting'`;
		const [line] = await tx
			.select({
				highestNumber: sql<number | null>`max(${visits.queuePosition})`,
				highestPriorityNumber: sql<number | null>`max(${visits.priorityNumber})`,
				highestOrder: sql<number | null>`max(${visits.queueOrder})`,
				othersWaiting: sql<number>`count(*) FILTER (WHERE ${othersWaiting})::int`,
			})
			.from(visits)
			.where(eq(visits.marketEventId, marketEventId));

		return new LineOrder({
			highestNumber: line?.highestNumber ?? null,
			highestPriorityNumber: line?.highestPriorityNumber ?? null,
			highestOrder: line?.highestOrder ?? null,
			othersWaiting: line?.othersWaiting ?? 0,
		}).place(placement, visit?.held ?? null);
	});
}
