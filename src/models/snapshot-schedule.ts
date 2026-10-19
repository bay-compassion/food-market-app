import { periodKinds, WarehousePeriod, type PeriodKind } from './warehouse-period.ts';

export type SnapshotKind = 'session' | PeriodKind;

/** A snapshot already in the warehouse, identified the way its unique index identifies it. */
export type TakenSnapshot = { kind: SnapshotKind; periodStart: Date };

export type DueSnapshot = { kind: SnapshotKind; start: Date; end: Date; timeZone: string };

/**
 * Which snapshots the warehouse is owed and does not have yet.
 *
 * A session is owed once it has ended and `settleDays` have passed since it opened; a month,
 * quarter, or year once it has ended and the same days have passed. Workers can still record a
 * visit after a session ends, so freezing a number the moment it ends would freeze it short.
 *
 * Nothing before the first ended session is owed, which is also what makes the first runs a
 * backfill: every settled period since the market began is due until it has been written.
 */
export class SnapshotSchedule {
	private readonly taken: Set<string>;

	constructor(
		private readonly endedSessionOpenings: readonly Date[],
		taken: Iterable<TakenSnapshot>,
		private readonly timeZone: string,
		private readonly settleDays: number,
	) {
		this.taken = new Set([...taken].map((snapshot) => SnapshotSchedule.key(snapshot)));
	}

	private static key({ kind, periodStart }: TakenSnapshot) {
		return `${kind}@${periodStart.toISOString()}`;
	}

	/** Oldest first, sessions before periods, so a capped run always makes the earliest progress. */
	dueAt(now: Date): DueSnapshot[] {
		const openings = [...this.endedSessionOpenings].sort((a, b) => a.getTime() - b.getTime());
		const first = openings[0];

		if (!first) {
			return [];
		}

		const settleMs = this.settleDays * 24 * 60 * 60 * 1000;
		const sessions: DueSnapshot[] = openings
			.filter((opening) => opening.getTime() + settleMs <= now.getTime())
			.map((opening) => ({
				kind: 'session',
				start: opening,
				end: new Date(opening.getTime() + 1),
				timeZone: this.timeZone,
			}));
		const periods: DueSnapshot[] = periodKinds.flatMap((kind) =>
			WarehousePeriod.settled(kind, first, now, this.timeZone, this.settleDays).map((period) => ({
				kind,
				start: period.start,
				end: period.end,
				timeZone: this.timeZone,
			})),
		);

		return [...sessions, ...periods].filter(
			(due) => !this.taken.has(SnapshotSchedule.key({ kind: due.kind, periodStart: due.start })),
		);
	}
}
