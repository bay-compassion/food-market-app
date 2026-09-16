import { and, eq, inArray, sql } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { marketEvents, visits } from '../../db/schema.mjs';
import {
	canRunSessionCommand,
	sessionCommandTarget,
} from '../../src/services/sessionStateMachine.js';
import { tracedQuery } from '../lib/sentry.mjs';
import type { ActionResult, MarketEventRow } from './marketSession.mjs';
import { queueNotification } from './notifications.mjs';
import { notificationsEnabled } from './pushNotifications.mjs';

/**
 * Orders visits for the draw, giving a heavier `lotteryWeight` proportionally better odds of
 * landing near the front.
 *
 * Each visit gets the key `random^(1/weight)` and the list is sorted by that key, descending.
 * Sorting by that key is equivalent to drawing entries one at a time without replacement, each
 * time in proportion to the weights still in the pool (Efraimidis–Spirakis), so a visit weighted 2
 * really is twice as likely as a 1 to come out ahead — not merely sorted ahead of it.
 *
 * With every weight left at the default 1 this is a plain uniform shuffle.
 */
export function weightedShuffle<T extends { lotteryWeight: number }>(items: T[]) {
	return items
		.map((item) => {
			const random = crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32;

			return { item, key: random ** (1 / Math.max(1, item.lotteryWeight)) };
		})
		.sort((first, second) => second.key - first.key)
		.map(({ item }) => item);
}

export async function runLottery(
	event: MarketEventRow,
	shuffleFn: <T extends { lotteryWeight: number }>(items: T[]) => T[] = weightedShuffle,
): Promise<ActionResult> {
	if (!canRunSessionCommand(event.status, 'run_lottery')) {
		return {
			ok: false,
			status: 409,
			error: 'The lottery can only run after the registration grace period ends.',
		};
	}
	const lotteryTarget = sessionCommandTarget('run_lottery');

	if (!lotteryTarget) {
		return { ok: false, status: 500, error: 'The lottery transition is not configured.' };
	}

	const completed = await tracedQuery('market_session.run_lottery', () =>
		db
			.transaction(async (tx) => {
				// Registration takes this same row lock before its final eligibility check. Once this
				// transaction observes `lottery_pending`, no late visit can enter the frozen pool.
				const [lockedEvent] = await tx
					.select()
					.from(marketEvents)
					.where(eq(marketEvents.id, event.id))
					.limit(1)
					.for('update');

				if (!lockedEvent || lockedEvent.status !== 'lottery_pending') {
					throw new Error('INVALID_SESSION_TRANSITION');
				}

				const registrations = await tx
					.select({ id: visits.id, lotteryWeight: visits.lotteryWeight })
					.from(visits)
					.where(and(eq(visits.marketEventId, event.id), eq(visits.status, 'registered')));
				const shuffled = shuffleFn(registrations);
				// A worker can place a guest straight into the line before the draw. Those guests are
				// already `waiting`, so they use capacity and the winners queue behind them.
				const [placed] = await tx
					.select({
						count: sql<number>`count(*)::int`,
						highestPosition: sql<number | null>`max(${visits.queuePosition})`,
					})
					.from(visits)
					.where(and(eq(visits.marketEventId, event.id), eq(visits.status, 'waiting')));
				const reservedCount = placed?.count ?? 0;
				const positionOffset = placed?.highestPosition ?? 0;
				const remainingCapacity = Math.max(0, lockedEvent.capacity - reservedCount);
				const selectedRegistrations = shuffled.slice(0, remainingCapacity);
				const selected = selectedRegistrations.map(({ id }) => id);
				const notPlaced = shuffled.slice(remainingCapacity).map(({ id }) => id);

				const [started] = await tx
					.update(marketEvents)
					.set({ status: lotteryTarget })
					.where(and(eq(marketEvents.id, event.id), eq(marketEvents.status, 'lottery_pending')))
					.returning({ id: marketEvents.id });

				if (!started) {
					throw new Error('INVALID_SESSION_TRANSITION');
				}

				if (selected.length) {
					const positions = selectedRegistrations.map(
						(registration, index) =>
							sql`(${registration.id}::uuid, ${index + 1 + positionOffset}::integer)`,
					);

					await tx.execute(sql`
					UPDATE ${visits} AS visit
					SET status = 'waiting', queue_position = positions.position
					FROM (VALUES ${sql.join(positions, sql`, `)}) AS positions(id, position)
					WHERE visit.id = positions.id
				`);

					if (notificationsEnabled()) {
						await queueNotification(tx, selected, 'lottery_selected', 'lottery_selected');
					}
				}

				if (notPlaced.length) {
					await tx
						.update(visits)
						.set({ status: 'not_placed' })
						.where(inArray(visits.id, notPlaced));

					if (notificationsEnabled()) {
						await queueNotification(tx, notPlaced, 'lottery_not_selected', 'lottery_not_selected');
					}
				}

				return true;
			})
			.catch((cause: unknown) => {
				if (cause instanceof Error && cause.message === 'INVALID_SESSION_TRANSITION') {
					return false;
				}
				throw cause;
			}),
	);

	if (!completed) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}

	return { ok: true };
}
