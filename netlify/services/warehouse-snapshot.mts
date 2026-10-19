import { and, eq, gte, isNotNull, lt, min } from 'drizzle-orm';

import type { db as appDb } from '../../db/index.mjs';
import { guests, marketEvents, marketLocations, visits } from '../../db/schema.mjs';
import {
	periodComposition,
	periodLottery,
	periodReach,
	sessionFacts,
	snapshots,
} from '../../db/warehouse-schema.mjs';
import { GuestReconciliation, type GuestIdentity } from '../../src/models/guest-reconciliation.js';
import { PeriodReach } from '../../src/models/period-reach.js';
import { SnapshotSchedule, type DueSnapshot } from '../../src/models/snapshot-schedule.js';
import type { ReportRow } from '../../src/services/reports.js';
import { getLogger } from '../lib/logging.mjs';
import { tracedQuery } from '../lib/sentry.mjs';
import { runReport } from './reports.mjs';

/** Bumped whenever a counting rule changes, and stored on every snapshot. */
export const warehouseDefinitions = 'v1';

/** Days after a session or period ends before it is frozen. An open decision; see the doc. */
export const settleDays = 7;

/**
 * Enough to finish well inside a scheduled function's time limit. The first runs after launch
 * backfill every settled period since the market began, a batch a day, oldest first.
 */
export const maxSnapshotsPerRun = 25;

type Database = typeof appDb;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

/** Operational facts shared by every period snapshot in one run, loaded once and only if needed. */
type GuestHistory = { reconciliation: GuestReconciliation; firstServed: Map<string, Date> };

/**
 * A report column, read strictly. A missing row is a real zero (service timing has no row for a
 * session nobody was served at), but a row missing the column means the report changed shape — and
 * a zero written into an append-only warehouse could never be taken back.
 */
function column(row: ReportRow | undefined, key: string): number | null {
	if (!row) {
		return null;
	}

	if (!(key in row)) {
		throw new Error(`Report row has no "${key}" column; the warehouse mapping is out of date`);
	}

	return row[key] == null ? null : Number(row[key]);
}

const count = (row: ReportRow | undefined, key: string) => column(row, key) ?? 0;

/**
 * Writes the warehouse snapshots that are due: reads the operational tables and writes only
 * aggregates to the `warehouse` schema beside them. See `docs/data-warehousing.md`.
 *
 * Each snapshot is written in its own transaction, and its insert does nothing when the snapshot
 * already exists, so two overlapping runs or a run retried after a failure cannot write one twice.
 * Nothing here updates or deletes a warehouse row; a correction is a new revision.
 */
export class WarehouseSnapshotter {
	private history: GuestHistory | null = null;

	constructor(
		private readonly db: Database,
		private readonly now: Date = new Date(),
	) {}

	async run(): Promise<{ written: number; remaining: number }> {
		const timeZone = await this.marketTimeZone();

		if (!timeZone) {
			return { written: 0, remaining: 0 };
		}

		const endedSessions = await this.db
			.select({ opensAt: marketEvents.registrationOpensAt })
			.from(marketEvents)
			.where(eq(marketEvents.status, 'ended'));
		const taken = await this.db
			.select({ kind: snapshots.kind, periodStart: snapshots.periodStart })
			.from(snapshots);
		const due = new SnapshotSchedule(
			endedSessions.map((session) => session.opensAt),
			taken,
			timeZone,
			settleDays,
		).dueAt(this.now);
		const batch = due.slice(0, maxSnapshotsPerRun);
		let written = 0;

		for (const snapshot of batch) {
			if (await this.write(snapshot)) {
				written += 1;
				getLogger().info({
					message: 'warehouse.snapshot',
					kind: snapshot.kind,
					periodStart: snapshot.start.toISOString(),
				});
			}
		}

		return { written, remaining: due.length - batch.length };
	}

	/**
	 * Period boundaries are drawn in the market's time zone. The warehouse counts one market, so a
	 * second location is a failure to report, not something to guess around.
	 */
	private async marketTimeZone(): Promise<string | null> {
		const locations = await this.db
			.select({ timeZone: marketLocations.timeZone })
			.from(marketLocations);

		if (locations.length > 1) {
			throw new Error('Warehouse snapshots assume one market location; see data-warehousing.md');
		}

		return locations[0]?.timeZone ?? null;
	}

	/** Every report row is mapped before anything is written, so a mapping error writes nothing. */
	private async write(snapshot: DueSnapshot): Promise<boolean> {
		const range = { start: snapshot.start, end: snapshot.end };

		if (snapshot.kind === 'session') {
			const [summary] = await runReport('session-summary', range);
			const [timing] = await runReport('service-timing', range);
			const facts = {
				capacity: count(summary, 'capacity'),
				signUps: count(summary, 'signUps'),
				served: count(summary, 'served'),
				noShows: count(summary, 'noShows'),
				notPlaced: count(summary, 'notPlaced'),
				workerAdded: count(summary, 'walkIns'),
				medianWaitMinutes: column(timing, 'medianWait'),
				longestWaitMinutes: column(timing, 'longestWait'),
				untimed: count(timing, 'unrecorded'),
			};

			return this.insert(snapshot, async (tx, snapshotId) => {
				await tx.insert(sessionFacts).values({ snapshotId, ...facts });
			});
		}

		const served = await this.servedVisits(range);
		const lottery = (await runReport('lottery-outcomes', range)).map((row) => ({
			lotteryWeight: count(row, 'weight'),
			entries: count(row, 'entries'),
			placed: count(row, 'placed'),
		}));
		const history = await this.guestHistory();
		const reach = new PeriodReach(served, history.reconciliation, history.firstServed, range);
		const { totals, composition } = reach;

		return this.insert(snapshot, async (tx, snapshotId) => {
			await tx.insert(periodReach).values({ snapshotId, ...totals });

			if (composition.length > 0) {
				await tx
					.insert(periodComposition)
					.values(composition.map((row) => ({ snapshotId, ...row })));
			}

			if (lottery.length > 0) {
				await tx.insert(periodLottery).values(lottery.map((row) => ({ snapshotId, ...row })));
			}
		});
	}

	/** Inserts the snapshot row and its facts together; false when the snapshot already existed. */
	private insert(
		snapshot: DueSnapshot,
		facts: (tx: Transaction, id: string) => Promise<void>,
	): Promise<boolean> {
		return tracedQuery('warehouse.write_snapshot', () =>
			this.db.transaction(async (tx) => {
				const [inserted] = await tx
					.insert(snapshots)
					.values({
						kind: snapshot.kind,
						periodStart: snapshot.start,
						periodEnd: snapshot.end,
						timeZone: snapshot.timeZone,
						definitions: warehouseDefinitions,
					})
					.onConflictDoNothing()
					.returning({ id: snapshots.id });

				if (!inserted) {
					return false;
				}

				await facts(tx, inserted.id);

				return true;
			}),
		);
	}

	private servedVisits({ start, end }: { start: Date; end: Date }) {
		return tracedQuery('warehouse.read_served_visits', () =>
			this.db
				.select({
					guestId: visits.guestId,
					marketEventId: visits.marketEventId,
					sessionOpensAt: marketEvents.registrationOpensAt,
					ageRange: visits.ageRange,
					householdSize: visits.householdSize,
					childrenCount: visits.childrenCount,
					seniorsCount: visits.seniorsCount,
					locale: guests.locale,
				})
				.from(visits)
				.innerJoin(marketEvents, eq(marketEvents.id, visits.marketEventId))
				.innerJoin(guests, eq(guests.id, visits.guestId))
				.where(
					and(
						eq(visits.status, 'served'),
						eq(guests.fake, false),
						gte(marketEvents.registrationOpensAt, start),
						lt(marketEvents.registrationOpensAt, end),
					),
				),
		);
	}

	/**
	 * Reconciliation reads every guest record and every phone their visits were made with, since
	 * two records in a period can be linked only through a third outside it. Names and phones stay
	 * in this function's memory; only counts reach the warehouse tables.
	 */
	private async guestHistory(): Promise<GuestHistory> {
		if (this.history) {
			return this.history;
		}

		const [records, visitPhones, firsts] = await tracedQuery('warehouse.read_guest_history', () =>
			Promise.all([
				this.db
					.select({
						guestId: guests.id,
						firstName: guests.firstName,
						lastName: guests.lastName,
						phone: guests.normalizedPhone,
					})
					.from(guests)
					.where(eq(guests.fake, false)),
				this.db
					.selectDistinct({ guestId: visits.guestId, phone: visits.normalizedPhone })
					.from(visits)
					.where(isNotNull(visits.normalizedPhone)),
				this.db
					.select({
						guestId: visits.guestId,
						first: min(marketEvents.registrationOpensAt),
					})
					.from(visits)
					.innerJoin(marketEvents, eq(marketEvents.id, visits.marketEventId))
					.where(eq(visits.status, 'served'))
					.groupBy(visits.guestId),
			]),
		);
		const identities = new Map<string, GuestIdentity & { phones: string[] }>(
			records.map((record) => [
				record.guestId,
				{ ...record, phones: record.phone ? [record.phone] : [] },
			]),
		);

		for (const { guestId, phone } of visitPhones) {
			if (phone) {
				identities.get(guestId)?.phones.push(phone);
			}
		}

		this.history = {
			reconciliation: new GuestReconciliation(identities.values()),
			firstServed: new Map(
				firsts.flatMap((row) => (row.first ? [[row.guestId, row.first] as const] : [])),
			),
		};

		return this.history;
	}
}
