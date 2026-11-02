import { sql, type SQL } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { languages } from '../../src/locales.js';
import type { ReportId, ReportRow } from '../../src/services/reports.js';
import { tracedQuery } from '../lib/sentry.mjs';

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

/** Aggregate each source before joining: anonymous entries must never multiply visit rows. */
function sessionSummary({ start, end }: ReportRange) {
	return sql`
  WITH identified AS (
   SELECT market_event_id,
    count(*)::int AS sign_ups,
    count(*) FILTER (WHERE status = 'served')::int AS served,
    coalesce(sum(household_size) FILTER (WHERE status = 'served'), 0)::int AS members,
    count(*) FILTER (WHERE status = 'no_show')::int AS no_shows,
    count(*) FILTER (WHERE status = 'not_placed')::int AS not_placed,
    count(*) FILTER (WHERE source = 'admin')::int AS walk_ins
   FROM visits GROUP BY market_event_id
  ), anonymous AS (
   SELECT market_event_id, count(*)::int AS households, sum(household_size)::int AS members
   FROM household_service_entries WHERE voided_at IS NULL GROUP BY market_event_id
  )
  SELECT e.registration_opens_at AS "sessionDate", e.capacity::int AS "capacity",
   coalesce(v.sign_ups, 0)::int AS "signUps",
   (coalesce(v.served, 0) + coalesce(a.households, 0))::int AS "served",
   (coalesce(v.members, 0) + coalesce(a.members, 0))::int AS "peopleServings",
   coalesce(a.households, 0)::int AS "countOnlyHouseholds",
   coalesce(a.members, 0)::int AS "countOnlyMembers",
   coalesce(v.no_shows, 0)::int AS "noShows", coalesce(v.not_placed, 0)::int AS "notPlaced",
   coalesce(v.walk_ins, 0)::int AS "walkIns",
   CASE WHEN e.capacity > 0 THEN round(
    (coalesce(v.served, 0) + coalesce(a.households, 0))::numeric * 100 / e.capacity, 1
   )::float8 END AS "fillRate"
  FROM market_events e
  LEFT JOIN identified v ON v.market_event_id = e.id
  LEFT JOIN anonymous a ON a.market_event_id = e.id
  WHERE e.registration_opens_at >= ${start} AND e.registration_opens_at < ${end}
  ORDER BY e.registration_opens_at DESC
 `;
}

/**
 * Monthly service totals include anonymous households. Unique guests and monthly household
 * members remain identified-only: anonymous households cannot be deduplicated across sessions.
 * peopleServings sums household sizes for every completed shopping, including repeat visits.
 */
function peopleServed({ start, end }: ReportRange) {
	return sql`
  WITH served AS (
   SELECT date_trunc('month', e.registration_opens_at) AS month, e.id AS event_id,
    v.guest_id, v.household_size, e.registration_opens_at AS opens_at
   FROM market_events e JOIN visits v ON v.market_event_id = e.id AND v.status = 'served'
   WHERE e.registration_opens_at >= ${start} AND e.registration_opens_at < ${end}
  ), anonymous AS (
   SELECT date_trunc('month', e.registration_opens_at) AS month, e.id AS event_id,
    a.household_size
   FROM market_events e JOIN household_service_entries a ON a.market_event_id = e.id
   WHERE a.voided_at IS NULL AND e.registration_opens_at >= ${start} AND e.registration_opens_at < ${end}
  ), first_served AS (
   SELECT v.guest_id, min(e.registration_opens_at) AS first_at
   FROM visits v JOIN market_events e ON e.id = v.market_event_id
   WHERE v.status = 'served' AND v.guest_id IN (SELECT guest_id FROM served)
   GROUP BY v.guest_id
  ), households AS (
   SELECT DISTINCT ON (month, guest_id) month, guest_id, household_size
   FROM served ORDER BY month, guest_id, opens_at DESC
  ), all_service AS (
   SELECT month, event_id, household_size FROM served
   UNION ALL
   SELECT month, event_id, household_size FROM anonymous
  )
  SELECT to_char(s.month, 'YYYY-MM') AS "month", count(DISTINCT s.event_id)::int AS "sessions",
   count(*)::int AS "served", sum(s.household_size)::int AS "peopleServings",
   (SELECT count(DISTINCT v.guest_id)::int FROM served v WHERE v.month = s.month) AS "uniqueGuests",
   (SELECT coalesce(sum(h.household_size), 0)::int FROM households h WHERE h.month = s.month) AS "householdMembers",
   (SELECT count(DISTINCT v.guest_id)::int FROM served v JOIN first_served f ON f.guest_id = v.guest_id
    WHERE v.month = s.month AND v.opens_at = f.first_at) AS "firstTime",
   (SELECT count(*)::int FROM anonymous a WHERE a.month = s.month) AS "countOnlyHouseholds",
   (SELECT coalesce(sum(a.household_size), 0)::int FROM anonymous a WHERE a.month = s.month) AS "countOnlyMembers"
  FROM all_service s GROUP BY s.month ORDER BY s.month DESC
 `;
}

/**
 * Who was served, in long form — one row per category and value, so age bands, household sizes,
 * and languages share a table instead of needing three reports. Each guest is counted once no
 * matter how many times they came, described by their latest served visit in the range.
 */
function guestDemographics({ start, end }: ReportRange) {
	return sql`
		WITH served_guests AS (
			SELECT DISTINCT ON (g.id) g.id, v.age_range, v.household_size, g.locale
			FROM market_events e
			JOIN visits v ON v.market_event_id = e.id AND v.status = 'served'
			JOIN guests g ON g.id = v.guest_id
			WHERE e.registration_opens_at >= ${start} AND e.registration_opens_at < ${end}
			ORDER BY g.id, e.registration_opens_at DESC
		),
		facts AS (
			SELECT 'age' AS category, age_range AS value FROM served_guests
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
 * Whether raised odds actually changed who got in. It counts exactly what `DrawEntry` counts: a
 * visit the draw drew or passed over, whoever added it. Visits older than the history have none at
 * all, so those count when the guest registered themselves and reached a state only the draw would
 * normally put them in. A guest a worker placed straight into the line never went through the draw,
 * and neither has a visit still `registered`.
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
			AND (
				EXISTS (
					SELECT 1 FROM visit_events ve
					WHERE ve.visit_id = v.id AND ve.kind IN ('drawn', 'not_drawn')
				)
				OR (
					v.source = 'self'
					AND NOT EXISTS (SELECT 1 FROM visit_events ve WHERE ve.visit_id = v.id)
					AND (
						v.status IN ('waiting', 'called', 'served', 'no_show', 'not_placed')
						OR (v.status = 'cancelled' AND v.queue_position IS NOT NULL)
					)
				)
			)
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

/**
 * `db.execute` resolves to the driver's result object — `{ rows, fields, rowCount, ... }` — not to
 * the rows themselves. Its type degrades to `any` here, so the rows are annotated rather than
 * inferred; without that, reading the result wrongly compiles and only fails once it runs.
 */
export async function runReport(id: ReportId, range: ReportRange): Promise<ReportRow[]> {
	const { rows }: { rows: ReportRow[] } = await tracedQuery('report.run', () =>
		db.execute<ReportRow>(reportQueries[id](range)),
	);

	return rows;
}

/** Column headings for the raw export. These are database column names, not prose to translate. */
export const visitExportHeaders = [
	'session_opens_at',
	'session_capacity',
	'session_status',
	'visit_status',
	'visit_source',
	'queue_position',
	'priority_number',
	'lottery_weight',
	'is_first_visit',
	'registered_at',
	'called_at',
	'served_at',
	'guest_first_name',
	'guest_last_name',
	'visit_age_range',
	'visit_household_size',
	'visit_children_count',
	'visit_seniors_count',
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
	const { rows }: { rows: Record<string, unknown>[] } = await tracedQuery(
		'report.visit_export',
		() =>
			db.execute(sql`
		SELECT
			e.registration_opens_at AS "session_opens_at",
			e.capacity AS "session_capacity",
			e.status AS "session_status",
			v.status AS "visit_status",
			v.source AS "visit_source",
			v.queue_position AS "queue_position",
			v.priority_number AS "priority_number",
			v.lottery_weight AS "lottery_weight",
			v.is_first_visit AS "is_first_visit",
			v.created_at AS "registered_at",
			v.called_at AS "called_at",
			v.served_at AS "served_at",
			g.first_name AS "guest_first_name",
			g.last_name AS "guest_last_name",
			v.age_range AS "visit_age_range",
			v.household_size AS "visit_household_size",
			v.children_count AS "visit_children_count",
			v.seniors_count AS "visit_seniors_count",
			g.phone AS "guest_phone",
			g.locale AS "guest_locale"
		FROM market_events e
		JOIN visits v ON v.market_event_id = e.id
		JOIN guests g ON g.id = v.guest_id
		WHERE e.registration_opens_at >= ${start} AND e.registration_opens_at < ${end}
		ORDER BY e.registration_opens_at DESC, v.queue_front DESC, v.queue_order ASC NULLS LAST,
			v.created_at ASC
	`),
	);

	return rows.map((row) => visitExportHeaders.map((header) => row[header] as string | null));
}
