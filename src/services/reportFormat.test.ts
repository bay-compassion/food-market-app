import { describe, expect, it } from 'vitest';

import { formatReportCell, missingValue, reportCsvRows } from './reportFormat';
import { reportColumns, type ReportValueKey } from './reports';

const labels: Record<ReportValueKey, string> = {
	age: 'Age',
	household: 'Household size',
	language: 'Language',
};

describe('formatReportCell', () => {
	it('marks a missing value rather than showing it as a zero', () => {
		expect(formatReportCell(null, 'number', 'en', labels)).toBe(missingValue);
		expect(formatReportCell(undefined, 'percent', 'en', labels)).toBe(missingValue);
		expect(formatReportCell('', 'text', 'en', labels)).toBe(missingValue);
	});

	it('keeps a real zero, which is not the same as no value', () => {
		expect(formatReportCell(0, 'number', 'en', labels)).toBe('0');
	});

	it('reads a rate as a percentage of a hundred, not of one', () => {
		expect(formatReportCell(62.5, 'percent', 'en', labels)).toBe('62.5%');
	});

	it('translates a label column through the value dictionary', () => {
		expect(formatReportCell('household', 'label', 'en', labels)).toBe('Household size');
	});

	it('falls back to the raw value when a label is not one it knows', () => {
		expect(formatReportCell('something-else', 'label', 'en', labels)).toBe('something-else');
	});

	it('formats a month as a month, in the reader locale', () => {
		expect(formatReportCell('2026-03', 'month', 'en', labels)).toBe('March 2026');
		expect(formatReportCell('2026-03', 'month', 'es', labels)).toBe('marzo de 2026');
	});

	it('formats minutes with a localised unit', () => {
		expect(formatReportCell(12.5, 'minutes', 'en', labels)).toBe('12.5 min');
	});
});

describe('reportCsvRows', () => {
	const columns = reportColumns['guest-demographics'];

	it('translates label columns but leaves numbers raw for the spreadsheet', () => {
		const rows = reportCsvRows(
			columns,
			[{ category: 'age', value: '30-44', guests: 12, share: 25.5 }],
			labels,
		);

		expect(rows).toEqual([['Age', '30-44', 12, 25.5]]);
	});

	it('emits one cell per column even when a value is missing', () => {
		const rows = reportCsvRows(columns, [{ category: 'age' }], labels);

		expect(rows[0]).toHaveLength(columns.length);
	});
});
