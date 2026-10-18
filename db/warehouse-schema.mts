import {
	doublePrecision,
	integer,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core';

import type { SnapshotKind } from '../src/models/snapshot-schedule.js';

/**
 * The long-term warehouse: frozen, anonymous, aggregate numbers, in a database of its own. See
 * `docs/data-warehousing.md`.
 *
 * Nothing here identifies a guest — no names, phones, guest or visit ids, credentials, or free
 * text — and nothing here is ever updated or deleted. The scheduled writer's database role holds
 * `INSERT` and `SELECT` only, so a correction is a new snapshot that names the one it supersedes.
 *
 * These tables are not in `netlify/database/migrations/`, which applies to the app's own database
 * on every deploy. Their migrations live in `db/warehouse-migrations/` and a human applies them.
 */

export const snapshots = pgTable(
	'snapshots',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		kind: text('kind').$type<SnapshotKind>().notNull(),
		/** A session's registration opening, or the first instant of a period in the market's zone. */
		periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
		/** Exclusive. For a session, one millisecond after it opened. */
		periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
		/** The market's IANA time zone the period boundaries were drawn in. */
		timeZone: text('time_zone').notNull(),
		/** 1 for the routine's snapshot; a correction takes the next number. */
		revision: integer('revision').notNull().default(1),
		supersedes: uuid('supersedes'),
		/** Which counting rules produced the numbers, so a rule change is visible in the data. */
		definitions: text('definitions').notNull(),
		takenAt: timestamp('taken_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex('snapshots_kind_period_revision_idx').on(
			table.kind,
			table.periodStart,
			table.revision,
		),
	],
);

/** One session as it ended: the Session Summary and Service Timing reports, frozen. */
export const sessionFacts = pgTable('session_facts', {
	snapshotId: uuid('snapshot_id')
		.primaryKey()
		.references(() => snapshots.id),
	capacity: integer('capacity').notNull(),
	signUps: integer('sign_ups').notNull(),
	served: integer('served').notNull(),
	noShows: integer('no_shows').notNull(),
	notPlaced: integer('not_placed').notNull(),
	workerAdded: integer('worker_added').notNull(),
	medianWaitMinutes: doublePrecision('median_wait_minutes'),
	longestWaitMinutes: doublePrecision('longest_wait_minutes'),
	/** Served visits with no call or serve time, which the wait figures do not cover. */
	untimed: integer('untimed').notNull(),
});

/** How many people and households one period reached, unduplicated within the period. */
export const periodReach = pgTable('period_reach', {
	snapshotId: uuid('snapshot_id')
		.primaryKey()
		.references(() => snapshots.id),
	sessions: integer('sessions').notNull(),
	visitsServed: integer('visits_served').notNull(),
	uniquePeople: integer('unique_people').notNull(),
	uniqueHouseholds: integer('unique_households').notNull(),
	householdMembers: integer('household_members').notNull(),
	children: integer('children').notNull(),
	seniors: integer('seniors').notNull(),
	/** People whose first served visit ever fell in this period. */
	firstTimePeople: integer('first_time_people').notNull(),
});

/** Who a period served, by age band, household size band, and language: one row per value. */
export const periodComposition = pgTable(
	'period_composition',
	{
		snapshotId: uuid('snapshot_id')
			.notNull()
			.references(() => snapshots.id),
		category: text('category').$type<'age' | 'household' | 'language'>().notNull(),
		value: text('value').notNull(),
		people: integer('people').notNull(),
	},
	(table) => [primaryKey({ columns: [table.snapshotId, table.category, table.value] })],
);

/** Lottery entries and placements in a period, by the odds each entry carried. */
export const periodLottery = pgTable(
	'period_lottery',
	{
		snapshotId: uuid('snapshot_id')
			.notNull()
			.references(() => snapshots.id),
		lotteryWeight: integer('lottery_weight').notNull(),
		entries: integer('entries').notNull(),
		placed: integer('placed').notNull(),
	},
	(table) => [primaryKey({ columns: [table.snapshotId, table.lotteryWeight] })],
);
