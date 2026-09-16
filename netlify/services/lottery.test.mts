import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../test/dbStub.mjs';
import { baseEvent } from '../test/marketEventFixture.mjs';

vi.mock('../../db/index.mjs', () => ({ db }));
vi.mock('./pushNotifications.mjs', () => ({ notificationsEnabled: vi.fn(() => true) }));
vi.mock('./notificationDispatch.mjs', () => ({ requestNotificationDispatch: vi.fn() }));
vi.mock('./sessionTimers.mjs', () => ({
	scheduleSessionTimers: vi.fn(),
	scheduleSessionTimersQuietly: vi.fn(),
	upcomingSessionTimers: ['registration_close', 'auto_close'],
}));

import { runLottery, weightedShuffle } from './lottery.mjs';
import { notificationsEnabled } from './pushNotifications.mjs';

afterEach(() => {
	resetDbStub();
	vi.mocked(notificationsEnabled).mockReturnValue(true);
});

describe('weightedShuffle', () => {
	const visit = (id: string, lotteryWeight: number) => ({ id, lotteryWeight });

	it('leaves every entry in the draw', () => {
		const entries = [visit('a', 1), visit('b', 5), visit('c', 2)];

		const ordered = weightedShuffle(entries);

		expect(ordered.map(({ id }) => id).sort()).toEqual(['a', 'b', 'c']);
	});

	it('favours the heavier weight when the underlying randomness is identical', () => {
		// key = random^(1/weight); with random held equal, a bigger weight always wins.
		vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(((array: Uint32Array) => {
			array[0] = 2 ** 31; // the same 0.5 for every entry

			return array;
		}) as typeof crypto.getRandomValues);

		const ordered = weightedShuffle([visit('light', 1), visit('heavy', 5), visit('middle', 2)]);

		expect(ordered.map(({ id }) => id)).toEqual(['heavy', 'middle', 'light']);
		vi.restoreAllMocks();
	});

	/** How often `id` came out on top across `runs` independent draws. */
	function firstPlaceCount(entries: { id: string; lotteryWeight: number }[], id: string) {
		const runs = 2000;

		return Array.from({ length: runs }, () => weightedShuffle(entries)).filter(
			(ordered) => ordered[0]!.id === id,
		).length;
	}

	it('gives odds in proportion to the weights, not merely an ordering', () => {
		// A weight of 1 against a weight of 5 should win 1-in-6 draws: 333 of 2000. The bounds are
		// five standard deviations (σ ≈ 16.7) either side, so a correct implementation effectively
		// never trips them — while a uniform shuffle (~1000) or a hard ordering (0) both would.
		const wins = firstPlaceCount([visit('light', 1), visit('heavy', 5)], 'light');

		expect(wins).toBeGreaterThan(250);
		expect(wins).toBeLessThan(417);
	});

	it('is an even shuffle when every weight is left at the default', () => {
		const wins = firstPlaceCount([visit('a', 1), visit('b', 1)], 'a');

		// Five standard deviations either side of a fair 1000.
		expect(wins).toBeGreaterThan(888);
		expect(wins).toBeLessThan(1112);
	});
});

describe('runLottery', () => {
	const identity = <T,>(items: T[]) => items;

	/**
	 * Pulls the interpolated values out of a Drizzle `sql` template, in order. Literal SQL is held
	 * in `StringChunk` objects while interpolated values sit in the chunk list as-is, and
	 * `sql.join` nests one template inside another — so collect the primitives and recurse.
	 */
	function sqlParameters(query: unknown): unknown[] {
		if (typeof query === 'string' || typeof query === 'number') {
			return [query];
		}
		const chunks = (query as { queryChunks?: unknown[] } | null)?.queryChunks;

		return Array.isArray(chunks) ? chunks.flatMap((chunk) => sqlParameters(chunk)) : [];
	}

	it('returns 409 when the lottery cannot run from the current status', async () => {
		const result = await runLottery(baseEvent({ status: 'scheduled' }));

		expect(result).toEqual({
			ok: false,
			status: 409,
			error: 'The lottery can only run after the registration grace period ends.',
		});
		expect(db.select).not.toHaveBeenCalled();
	});

	it('selects up to capacity and marks the remainder not_placed, in shuffle order', async () => {
		const event = baseEvent({ status: 'lottery_pending', capacity: 2 });

		queueResult([event]); // locked market event
		queueResult([{ id: 'v1' }, { id: 'v2' }, { id: 'v3' }]); // registered visits
		queueResult([{ count: 0, highestPosition: null }]); // nobody placed ahead of the draw
		queueResult([{ id: 'event-1' }]); // tx.update marketEvents ... returning (started)
		queueResult(undefined); // tx.execute (bulk queue-position update for selected)
		queueResult(undefined); // tx.insert notificationDeliveries (selected)
		queueResult(undefined); // tx.update visits set not_placed
		queueResult(undefined); // tx.insert notificationDeliveries (not placed)

		const result = await runLottery(event, identity);

		expect(result).toEqual({ ok: true });
	});

	it('skips the bulk update and notification inserts when there are no registrations', async () => {
		const event = baseEvent({ status: 'lottery_pending', capacity: 5 });

		queueResult([event]); // locked market event
		queueResult([]); // no registered visits
		queueResult([{ count: 0, highestPosition: null }]); // nobody placed ahead of the draw
		queueResult([{ id: 'event-1' }]); // tx.update marketEvents ... returning

		const result = await runLottery(event, identity);

		expect(result).toEqual({ ok: true });
		expect(db.execute).not.toHaveBeenCalled();
	});

	it('leaves room for guests a worker placed in the line before the draw', async () => {
		// Capacity 3 with two spots already handed out: only one registration can still win, and it
		// has to queue behind the reserved pair rather than reusing position 1.
		const event = baseEvent({ status: 'lottery_pending', capacity: 3 });

		queueResult([event]); // locked market event
		queueResult([{ id: 'v1' }, { id: 'v2' }]); // registered visits
		queueResult([{ count: 2, highestPosition: 2 }]); // two guests already waiting
		queueResult([{ id: 'event-1' }]); // tx.update marketEvents ... returning (started)
		queueResult(undefined); // tx.execute (bulk queue-position update for the single winner)
		queueResult(undefined); // tx.insert notificationDeliveries (selected)
		queueResult(undefined); // tx.update visits set not_placed
		queueResult(undefined); // tx.insert notificationDeliveries (not placed)

		const result = await runLottery(event, identity);

		expect(result).toEqual({ ok: true });
		// Exactly one winner, and it takes position 3 — immediately after the two reserved spots,
		// rather than reusing a position that is already spoken for.
		// The stub declares `execute` as taking no arguments, so reach past its call signature.
		const [positionUpdate] = db.execute.mock.calls[0] as unknown as [unknown];

		expect(sqlParameters(positionUpdate)).toEqual(['v1', 3]);
	});

	it('returns 409 when a concurrent process already moved the session before the lottery started', async () => {
		const event = baseEvent({ status: 'lottery_pending', capacity: 5 });

		queueResult([]); // locked event lookup — another process already moved it

		const result = await runLottery(event, identity);

		expect(result).toEqual({
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		});
	});
});
