/**
 * CSV building, shared by the browser (downloading a report you are looking at) and the Netlify
 * function (exporting the raw visit rows).
 */

export type CsvValue = string | number | boolean | Date | null | undefined;

/**
 * A leading byte-order mark. Without it Excel reads a UTF-8 file as the local single-byte
 * encoding, which mangles every guest name that is not plain ASCII — and this app registers
 * guests in Arabic, Farsi, Chinese, and Vietnamese.
 */
const byteOrderMark = '﻿';

function escapeField(value: CsvValue) {
	if (value === null || value === undefined) {
		return '';
	}
	const text = value instanceof Date ? value.toISOString() : String(value);

	// A field only needs quoting if it contains a delimiter, a quote, or a line break — but a
	// leading separator character would also let a spreadsheet read the cell as a formula.
	return /["\n\r,]/.test(text) || /^[=+\-@\t]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: CsvValue[][]) {
	const lines = [headers, ...rows].map((row) => row.map(escapeField).join(','));

	return byteOrderMark + lines.join('\r\n') + '\r\n';
}

/** A filename that sorts by range and says what it holds, e.g. `session-summary_2026-01-01_2026-08-08.csv`. */
export function csvFilename(name: string, from: string, to: string) {
	return `${name}_${from}_${to}.csv`;
}
