import { sql, type SQL } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { languages } from '../../src/locales.js';
import type { ReportId, ReportRow } from '../../src/services/reports.js';

/**
 * The SQL behind each predefined report.
 *
 * Every query is bounded by the session's `registration_opens_at` rather than a visit timestamp,
 * so a report period means "sessions held in this window" — the way a grant period is written.
 * Counts are cast to `int` and rates to `float8` because Postgres hands back `bigint` and
 * `numeric` as strings, which would sort and total wrongly in a spreadsheet.
 *
 * Column aliases must match the keys in `src/services/reports.ts`; that shared catalogue is what
 * tells the browser which columns to render and how.
 */

export type ReportRange = { start: Date; end: Date };

/**
 * Guests pick a language at registration, and its name is written in that language — `Español`,
 * not `Spanish` — so the label reads the same whatever locale the report is being viewed in.
 * Built from the app's own language list so a new language cannot be added without appearing here.
 */
const languageLabel = sql.join(
	languages.map((language) => sql`WHEN ${language.code} THEN ${language.label}`),
	sql` `,
);

/** One row per session: how it was set up and how it turned out. */
function sessionSummary({ start, end }: ReportRange) {
	return sql`
		SELECT
			e.registration_opens_at AS "sessionDate",
			e.capacity::int AS "capacity",
			count(v.id)::int AS "signUps",
			count(v.id) FILTER (WHERE v.status = 'served')::int AS "served",
			count(v.id) FILTER (WHERE v.status = 'no_show')::int AS "noShows",
			count(v.id) FILTER (WHERE v.status = 'not_placed')::int AS "notPlaced",
			count(v.id) FILTER (WHERE v.source = 'admin')::int AS "walkIns",
			CASE WHEN e.capacity > 0 THEN round(
				count(v.id) FILTER (WHERE v.status = 'served')::numeric * 100 / e.capacity, 1
			)::float8 END AS "fillRate"
		FROM market_events e
		LEFT JOIN visits v ON v.market_event_id = e.id
		WHERE e.registration_opens_at >= ${start} AND e.registration_opens_at < ${end}
		GROUP BY e.id, e.registration_opens_at, e.capacity
		ORDER BY e.registration_opens_at DESC
	`;
}

/**
 * One row per month, counted the way grant reports ask for it. `uniqueGuests` and
 * `householdMembers` are unduplicated within the month — someone who comes to three sessions in
 * March is one guest and one household, not three — while `served` counts every visit.
 */
function peopleServed({ start, end }: ReportRange) {
	return sql`
		WITH served AS (
			SELECT
				date_trunc('month', e.registration_opens_at) AS month,
				e.id AS event_id,
				v.guest_id,
				v.is_first_visit,
				g.household_size
			FROM market_events e
			JOIN visits v ON v.market_event_id = e.id AND v.status = 'served'
			JOIN guests g ON g.id = v.guest_id
			WHERE e.registration_opens_at >= ${start} AND e.registration_opens_at < ${end}
		),
		households AS (
			SELECT month, guest_id, max(household_size) AS household_size
			FROM served GROUP BY month, guest_id
		)
		SELECT
			to_char(s.month, 'YYYY-MM') AS "month",
			count(DISTINCT s.event_id)::int AS "sessions",
			count(*)::int AS "served",
			count(DISTINCT s.guest_id)::int AS "uniqueGuests",
			(
				SELECT coalesce(sum(h.household_size), 0)::int
				FROM households h WHERE h.month = s.month
			) AS "householdMembers",
			count(*) FILTER (WHERE s.is_first_visit)::int AS "firstTime"
		FROM served s
		GROUP BY s.month
		ORDER BY s.month DESC
	`;
}

/**
 * Who was served, in long form — one row per category and value, so age bands, household sizes,
 * and languages share a table instead of needing three reports. Each guest is counted once no
 * matter how many times they came.
 */
function guestDemographics({ start, end }: ReportRange) {
	return sql`
		WITH served_guests AS (
			SELECT DISTINCT g.id, g.age, g.household_size, g.locale
			FROM market_events e
			JOIN visits v ON v.market_event_id = e.id AND v.status = 'served'
			JOIN guests g ON g.id = v.guest_id
			WHERE e.registration_opens_at >= ${start} AND e.registration_opens_at < ${end}
		),
		facts AS (
			SELECT 'age' AS category, CASE
				WHEN age < 18 THEN '0-17'
				WHEN age < 30 THEN '18-29'
				WHEN age < 45 THEN '30-44'
				WHEN age < 60 THEN '45-59'
				WHEN age < 75 THEN '60-74'
				ELSE '75+'
			END AS value FROM served_guests
			UNION ALL
			SELECT 'household', CASE
				WHEN household_size = 1 THEN '1'
				WHEN household_size <= 3 THEN '2-3'
				WHEN household_size <= 5 THEN '4-5'
				ELSE '6+'
			END FROM served_guests
			UNION ALL
			SELECT 'language', CASE locale ${languageLabel} ELSE locale END FROM served_guests
		)
		SELECT
			category AS "category",
			value AS "value",
			count(*)::int AS "guests",
			round(count(*)::numeric * 100 / sum(count(*)) OVER (PARTITION BY category), 1)::float8
				AS "share"
		FROM facts
		GROUP BY category, value
		ORDER BY category, value
	`;
}

/**
 * Whether raised odds actually changed who got in. Only self-registered visits count: a guest a
 * worker placed straight into the line never went through the draw, so including them would
 * report a placement rate the lottery had nothing to do with. Visits still `registered` are left
 * out too — their session has not drawn yet.
 */
function lotteryOutcomes({ start, end }: ReportRange) {
	return sql`
		SELECT
			v.lottery_weight::int AS "weight",
			count(*)::int AS "entries",
			count(*) FILTER (WHERE v.status <> 'not_placed')::int AS "placed",
			round(
				count(*) FILTER (WHERE v.status <> 'not_placed')::numeric * 100 / count(*), 1
			)::float8 AS "placementRate"
		FROM market_events e
		JOIN visits v ON v.market_event_id = e.id
		WHERE e.registration_opens_at >= ${start} AND e.registration_opens_at < ${end}
			AND v.source = 'self'
			AND v.status IN ('waiting', 'called', 'served', 'no_show', 'not_placed')
		GROUP BY v.lottery_weight
		ORDER BY v.lottery_weight
	`;
}

/**
 * How long guests waited between being called and being served. `unrecorded` is the honest
 * counterweight: visits served before `served_at` existed, or recorded by hand after a session
 * ended, carry no timing, and a median drawn from the rest would otherwise look complete.
 */
function serviceTiming({ start, end }: ReportRange) {
	const waitMinutes = sql`EXTRACT(EPOCH FROM (v.served_at - v.called_at)) / 60`;

	return sql`
		SELECT
			e.registration_opens_at AS "sessionDate",
			count(*)::int AS "served",
			round(percentile_cont(0.5) WITHIN GROUP (ORDER BY ${waitMinutes})::numeric, 1)::float8
				AS "medianWait",
			round(max(${waitMinutes})::numeric, 1)::float8 AS "longestWait",
			count(*) FILTER (WHERE v.served_at IS NULL OR v.called_at IS NULL)::int AS "unrecorded"
		FROM market_events e
		JOIN visits v ON v.market_event_id = e.id AND v.status = 'served'
		WHERE e.registration_opens_at >= ${start} AND e.registration_opens_at < ${end}
		GROUP BY e.id, e.registration_opens_at
		ORDER BY e.registration_opens_at DESC
	`;
}

const reportQueries: Record<ReportId, (range: ReportRange) => SQL> = {
	'session-summary': sessionSummary,
	'people-served': peopleServed,
	'guest-demographics': guestDemographics,
	'lottery-outcomes': lotteryOutcomes,
	'service-timing': serviceTiming,
};

export async function runReport(id: ReportId, range: ReportRange): Promise<ReportRow[]> {
	const rows = await db.execute<ReportRow>(reportQueries[id](range));

	return [...rows];
}

/** Column headings for the raw export. These are database column names, not prose to translate. */
export const visitExportHeaders = [
	'session_opens_at',
	'session_capacity',
	'session_status',
	'visit_status',
	'visit_source',
	'queue_position',
	'lottery_weight',
	'is_first_visit',
	'registered_at',
	'called_at',
	'served_at',
	'guest_first_name',
	'guest_last_name',
	'guest_age',
	'guest_household_size',
	'guest_phone',
	'guest_locale',
];

/**
 * Every visit in the range, one row each, flattened across all three tables. This is the escape
 * hatch behind the predefined reports: anything they do not answer can be answered in a
 * spreadsheet from this. It carries guest names and phone numbers, so the UI gates it behind its
 * own deliberate action rather than bundling it with a report download.
 */
export async function runVisitExport({ start, end }: ReportRange) {
	const rows = await db.execute<Record<string, unknown>>(sql`
		SELECT
			e.registration_opens_at AS "session_opens_at",
			e.capacity AS "session_capacity",
			e.status AS "session_status",
			v.status AS "visit_status",
			v.source AS "visit_source",
			v.queue_position AS "queue_position",
			v.lottery_weight AS "lottery_weight",
			v.is_first_visit AS "is_first_visit",
			v.created_at AS "registered_at",
			v.called_at AS "called_at",
			v.served_at AS "served_at",
			g.first_name AS "guest_first_name",
			g.last_name AS "guest_last_name",
			g.age AS "guest_age",
			g.household_size AS "guest_household_size",
			g.phone AS "guest_phone",
			g.locale AS "guest_locale"
		FROM market_events e
		JOIN visits v ON v.market_event_id = e.id
		JOIN guests g ON g.id = v.guest_id
		WHERE e.registration_opens_at >= ${start} AND e.registration_opens_at < ${end}
		ORDER BY e.registration_opens_at DESC, v.queue_position ASC NULLS LAST, v.created_at ASC
	`);

	return [...rows].map((row) => visitExportHeaders.map((header) => row[header] as string | null));
}
