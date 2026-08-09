import type { Locale } from '../locales';
import type { ReportColumn, ReportColumnType, ReportRow, ReportValueKey } from './reports';

/**
 * Turning report cells into text.
 *
 * Reports come back from the server as plain numbers and ISO strings — no formatting, no
 * headings — so everything a reader sees is decided here, in the reader's own locale.
 */

export type ReportValueLabels = Record<ReportValueKey, string>;

/** Shown where a value is missing, so an empty cell is never mistaken for a zero. */
export const missingValue = '—';

function isValueKey(value: string): value is ReportValueKey {
	return value === 'age' || value === 'household' || value === 'language';
}

export function formatReportCell(
	value: string | number | null | undefined,
	type: ReportColumnType,
	locale: Locale,
	valueLabels: ReportValueLabels,
) {
	if (value === null || value === undefined || value === '') {
		return missingValue;
	}

	switch (type) {
		case 'datetime':
			return new Intl.DateTimeFormat(locale, {
				dateStyle: 'medium',
				timeStyle: 'short',
			}).format(new Date(value));
		// A month arrives as `YYYY-MM`; the day is added so it parses as a local date rather than UTC.
		case 'month':
			return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(
				new Date(`${value}-01T00:00:00`),
			);
		case 'number':
			return new Intl.NumberFormat(locale).format(Number(value));
		case 'percent':
			return new Intl.NumberFormat(locale, {
				style: 'percent',
				maximumFractionDigits: 1,
			}).format(Number(value) / 100);
		case 'minutes':
			return new Intl.NumberFormat(locale, {
				style: 'unit',
				unit: 'minute',
				unitDisplay: 'short',
				maximumFractionDigits: 1,
			}).format(Number(value));
		case 'label':
			return isValueKey(String(value))
				? valueLabels[String(value) as ReportValueKey]
				: String(value);
		default:
			return String(value);
	}
}

/**
 * The rows a CSV download carries. Numbers and dates stay raw so a spreadsheet reads them as
 * numbers and dates rather than as text it has to re-parse out of a localised format; only the
 * columns whose value is a translation key are turned into words.
 */
export function reportCsvRows(
	columns: ReportColumn[],
	rows: ReportRow[],
	valueLabels: ReportValueLabels,
) {
	return rows.map((row) =>
		columns.map((column) => {
			const value = row[column.key];

			return column.type === 'label' && typeof value === 'string' && isValueKey(value)
				? valueLabels[value]
				: value;
		}),
	);
}
