/**
 * The catalogue of predefined reports: what they are called, what columns they return, and how
 * each column should be rendered.
 *
 * This is deliberately shared between the browser and the Netlify function. The server owns the
 * SQL (`netlify/services/reports.ts`) and returns nothing but data — no column headings — so that
 * every heading stays in `adminLocales.ts` and gets translated like the rest of the app. The two
 * sides line up because they both read the column list from here.
 */

export const reportIds = [
	'session-summary',
	'people-served',
	'guest-demographics',
	'lottery-outcomes',
	'service-timing',
] as const;

export type ReportId = (typeof reportIds)[number];

/**
 * How a cell is rendered. `label` means the value is a key into `reportValueLabels` rather than
 * text to show as-is — the only way a translated string can come back from a SQL `GROUP BY`.
 */
export type ReportColumnType =
	| 'text'
	| 'label'
	| 'number'
	| 'percent'
	| 'minutes'
	| 'datetime'
	| 'month';

export const reportColumnKeys = [
	'capacity',
	'category',
	'entries',
	'fillRate',
	'firstTime',
	'guests',
	'householdMembers',
	'longestWait',
	'medianWait',
	'month',
	'noShows',
	'notPlaced',
	'placed',
	'placementRate',
	'served',
	'sessionDate',
	'sessions',
	'share',
	'signUps',
	'uniqueGuests',
	'unrecorded',
	'value',
	'walkIns',
	'weight',
] as const;

export type ReportColumnKey = (typeof reportColumnKeys)[number];

/** Values a report emits in a `label` column, which the UI translates before showing. */
export const reportValueKeys = ['age', 'household', 'language'] as const;

export type ReportValueKey = (typeof reportValueKeys)[number];

export type ReportColumn = { key: ReportColumnKey; type: ReportColumnType };

export type ReportRow = Record<string, string | number | null>;

export const reportColumns: Record<ReportId, ReportColumn[]> = {
	'session-summary': [
		{ key: 'sessionDate', type: 'datetime' },
		{ key: 'capacity', type: 'number' },
		{ key: 'signUps', type: 'number' },
		{ key: 'served', type: 'number' },
		{ key: 'noShows', type: 'number' },
		{ key: 'notPlaced', type: 'number' },
		{ key: 'walkIns', type: 'number' },
		{ key: 'fillRate', type: 'percent' },
	],
	'people-served': [
		{ key: 'month', type: 'month' },
		{ key: 'sessions', type: 'number' },
		{ key: 'served', type: 'number' },
		{ key: 'uniqueGuests', type: 'number' },
		{ key: 'householdMembers', type: 'number' },
		{ key: 'firstTime', type: 'number' },
	],
	'guest-demographics': [
		{ key: 'category', type: 'label' },
		{ key: 'value', type: 'text' },
		{ key: 'guests', type: 'number' },
		{ key: 'share', type: 'percent' },
	],
	'lottery-outcomes': [
		{ key: 'weight', type: 'number' },
		{ key: 'entries', type: 'number' },
		{ key: 'placed', type: 'number' },
		{ key: 'placementRate', type: 'percent' },
	],
	'service-timing': [
		{ key: 'sessionDate', type: 'datetime' },
		{ key: 'served', type: 'number' },
		{ key: 'medianWait', type: 'minutes' },
		{ key: 'longestWait', type: 'minutes' },
		{ key: 'unrecorded', type: 'number' },
	],
};

export function isReportId(value: unknown): value is ReportId {
	return reportIds.some((id) => id === value);
}

/** `YYYY-MM-DD`, the format the range inputs and the API agree on. */
export function toDateInput(date: Date) {
	const offset = date.getTimezoneOffset() * 60_000;

	return new Date(date.valueOf() - offset).toISOString().slice(0, 10);
}

/**
 * The range a report opens on: the past twelve months, which covers a full seasonal cycle and
 * matches how grant reporting periods are usually asked for.
 */
export function defaultReportRange() {
	const to = new Date();
	const from = new Date(to);
	from.setFullYear(from.getFullYear() - 1);

	return { from: toDateInput(from), to: toDateInput(to) };
}

/**
 * Turns the two date inputs into the half-open interval the SQL uses. `to` is inclusive on screen,
 * so it becomes the start of the following day — otherwise picking today would drop today.
 */
export function reportRangeBounds(from: string, to: string) {
	const start = new Date(`${from}T00:00:00`);
	const endOfDay = new Date(`${to}T00:00:00`);
	endOfDay.setDate(endOfDay.getDate() + 1);

	if (Number.isNaN(start.valueOf()) || Number.isNaN(endOfDay.valueOf()) || endOfDay <= start) {
		return null;
	}

	return { start, end: endOfDay };
}
