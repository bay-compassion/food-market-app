import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	periodComposition,
	periodReach,
	sessionFacts,
	snapshots,
} from '../../db/warehouse-schema.mjs';
import { db, queueResult, resetDbStub } from '../test/dbStub.mjs';

vi.mock('../../db/index.mjs', () => ({ db }));

import { WarehouseSnapshotter } from './warehouse-snapshot.mjs';

const zone = 'America/Los_Angeles';
const saturday = new Date('2026-09-05T17:30:00.000Z');
// Midday Pacific, 8 October: the 5 September session, September, and the third quarter are due.
const now = new Date('2026-10-08T19:00:00.000Z');

const summaryRow = {
	sessionDate: saturday.toISOString(),
	capacity: 30,
	signUps: 34,
	served: 28,
	noShows: 2,
	notPlaced: 4,
	walkIns: 3,
	fillRate: 93.3,
};

/**
 * Stands in for the warehouse database: records each insert by table, and answers the snapshot
 * insert with a fresh id unless `existing` says that snapshot is already there.
 */
function fakeWarehouse(existing: { kind: string; periodStart: Date }[] = []) {
	const inserts = new Map<unknown, unknown[]>();
	let ids = 0;
	const tx = {
		insert: (table: unknown) => ({
			values: (values: Record<string, unknown> | Record<string, unknown>[]) => {
				const rows = Array.isArray(values) ? values : [values];
				const duplicate =
					table === snapshots &&
					existing.some(
						(snapshot) =>
							snapshot.kind === rows[0]!.kind &&
							snapshot.periodStart.getTime() === (rows[0]!.periodStart as Date).getTime(),
					);

				if (!duplicate) {
					inserts.set(table, [...(inserts.get(table) ?? []), ...rows]);
				}

				const inserted = table === snapshots && !duplicate ? [{ id: `snapshot-${++ids}` }] : [];
				const result = Promise.resolve(inserted);

				return Object.assign(result, {
					onConflictDoNothing: () => ({ returning: () => result }),
				});
			},
		}),
	};
	const warehouse = {
		select: () => ({ from: () => Promise.resolve(existing) }),
		transaction: (callback: (transaction: typeof tx) => unknown) => callback(tx),
	};

	return { warehouse: warehouse as never, inserts };
}

/** The live reads for one location with one ended session and its two snapshotted periods. */
function queueLiveReads(summary: Record<string, unknown> = summaryRow) {
	queueResult([{ timeZone: zone }]);
	queueResult([{ opensAt: saturday }]);
	// The session: summary, then service timing (nobody timed, so no row).
	queueResult({ rows: [summary] });
	queueResult({ rows: [] });

	const served = [
		{
			guestId: 'desk',
			marketEventId: 'event-1',
			sessionOpensAt: saturday,
			ageRange: '30-44',
			householdSize: 3,
			childrenCount: 1,
			seniorsCount: 0,
			locale: 'es',
		},
		{
			guestId: 'phone',
			marketEventId: 'event-1',
			sessionOpensAt: saturday,
			ageRange: '30-44',
			householdSize: 3,
			childrenCount: 1,
			seniorsCount: 0,
			locale: 'es',
		},
	];

	// September: served visits, lottery, then the guest history read once for the whole run.
	queueResult(served);
	queueResult({ rows: [] });
	queueResult([
		{ guestId: 'desk', firstName: 'Ana', lastName: 'López', phone: '9255550100' },
		{ guestId: 'phone', firstName: 'Ana', lastName: 'Lopez', phone: '9255550100' },
	]);
	queueResult([]);
	queueResult([
		{ guestId: 'desk', first: saturday },
		{ guestId: 'phone', first: saturday },
	]);
	// The third quarter reuses the history.
	queueResult(served);
	queueResult({ rows: [] });
}

afterEach(() => {
	resetDbStub();
});

describe('WarehouseSnapshotter.run', () => {
	it('freezes a settled session and the periods it falls in', async () => {
		// Arrange
		queueLiveReads();
		const { warehouse, inserts } = fakeWarehouse();

		// Act
		const result = await new WarehouseSnapshotter(db as never, warehouse, now).run();

		// Assert
		expect(result).toEqual({ written: 3, remaining: 0 });
		expect(inserts.get(snapshots)).toMatchObject([
			{ kind: 'session', periodStart: saturday, timeZone: zone },
			{ kind: 'month', periodStart: new Date('2026-09-01T07:00:00.000Z') },
			{ kind: 'quarter', periodStart: new Date('2026-07-01T07:00:00.000Z') },
		]);
		expect(inserts.get(sessionFacts)).toEqual([
			{
				snapshotId: 'snapshot-1',
				capacity: 30,
				signUps: 34,
				served: 28,
				noShows: 2,
				notPlaced: 4,
				workerAdded: 3,
				medianWaitMinutes: null,
				longestWaitMinutes: null,
				untimed: 0,
			},
		]);
		expect(inserts.get(periodReach)![0]).toMatchObject({
			snapshotId: 'snapshot-2',
			visitsServed: 2,
			uniquePeople: 1,
			uniqueHouseholds: 1,
			householdMembers: 3,
			firstTimePeople: 1,
		});
		expect(inserts.get(periodComposition)).toContainEqual({
			snapshotId: 'snapshot-2',
			category: 'language',
			value: 'es',
			people: 1,
		});
	});

	it('refuses to write a session whose report no longer has a column it maps', async () => {
		// Arrange
		const { walkIns: _renamed, ...summary } = summaryRow;

		queueLiveReads(summary);
		const { warehouse, inserts } = fakeWarehouse();

		// Act
		const run = new WarehouseSnapshotter(db as never, warehouse, now).run();

		// Assert
		await expect(run).rejects.toThrow(/walkIns/);
		expect(inserts.size).toBe(0);
	});

	it('writes nothing while no location exists', async () => {
		// Arrange
		queueResult([]);
		const { warehouse, inserts } = fakeWarehouse();

		// Act
		const result = await new WarehouseSnapshotter(db as never, warehouse, now).run();

		// Assert
		expect(result).toEqual({ written: 0, remaining: 0 });
		expect(inserts.size).toBe(0);
	});
});
