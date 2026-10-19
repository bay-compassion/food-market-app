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

/** Every row handed to `insert(table).values(...)` for one table, in order. */
function insertedInto(table: unknown) {
	return (db.insert.mock.calls as unknown[][]).flatMap(([inserted], index) => {
		if (inserted !== table) {
			return [];
		}

		const { values } = db.insert.mock.results[index]!.value as { values: ReturnType<typeof vi.fn> };

		return values.mock.calls.flatMap(([rows]) => (Array.isArray(rows) ? rows : [rows]));
	});
}

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

/** What a run reads before it writes anything: one location, one ended session, no snapshots. */
function queueSchedule() {
	queueResult([{ timeZone: zone }]);
	queueResult([{ opensAt: saturday }]);
	queueResult([]);
}

/**
 * Every read and write of a run over one ended session, in the order the run makes them: the
 * session, then September, then the third quarter. Writes answer like Postgres: the snapshot insert
 * returns its id, and a facts insert returns nothing.
 */
function queueRun() {
	queueSchedule();
	// The session: summary, then service timing (nobody timed, so no row), then its writes.
	queueResult({ rows: [summaryRow] });
	queueResult({ rows: [] });
	queueResult([{ id: 'snapshot-1' }]);
	queueResult([]);
	// September: served visits, lottery, the guest history read once for the run, then its writes.
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
	queueResult([{ id: 'snapshot-2' }]);
	queueResult([]);
	queueResult([]);
	// The third quarter reuses the history.
	queueResult(served);
	queueResult({ rows: [] });
	queueResult([{ id: 'snapshot-3' }]);
	queueResult([]);
	queueResult([]);
}

afterEach(() => {
	resetDbStub();
});

describe('WarehouseSnapshotter.run', () => {
	it('freezes a settled session and the periods it falls in', async () => {
		// Arrange
		queueRun();

		// Act
		const result = await new WarehouseSnapshotter(db as never, now).run();

		// Assert
		expect(result).toEqual({ written: 3, remaining: 0 });
		expect(insertedInto(snapshots)).toMatchObject([
			{ kind: 'session', periodStart: saturday, timeZone: zone },
			{ kind: 'month', periodStart: new Date('2026-09-01T07:00:00.000Z') },
			{ kind: 'quarter', periodStart: new Date('2026-07-01T07:00:00.000Z') },
		]);
		expect(insertedInto(sessionFacts)).toEqual([
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
		expect(insertedInto(periodReach)[0]).toMatchObject({
			snapshotId: 'snapshot-2',
			visitsServed: 2,
			uniquePeople: 1,
			uniqueHouseholds: 1,
			householdMembers: 3,
			firstTimePeople: 1,
		});
		expect(insertedInto(periodComposition)).toContainEqual({
			snapshotId: 'snapshot-2',
			category: 'language',
			value: 'es',
			people: 1,
		});
	});

	it('refuses to write a session whose report no longer has a column it maps', async () => {
		// Arrange
		const { walkIns: _renamed, ...summary } = summaryRow;

		queueSchedule();
		queueResult({ rows: [summary] });
		queueResult({ rows: [] });

		// Act
		const run = new WarehouseSnapshotter(db as never, now).run();

		// Assert
		await expect(run).rejects.toThrow(/walkIns/);
		expect(db.insert).not.toHaveBeenCalled();
	});

	it('writes nothing while no location exists', async () => {
		// Arrange
		queueResult([]);

		// Act
		const result = await new WarehouseSnapshotter(db as never, now).run();

		// Assert
		expect(result).toEqual({ written: 0, remaining: 0 });
		expect(db.insert).not.toHaveBeenCalled();
	});
});
