import { describe, expect, it } from 'vitest';

import { csvFilename, toCsv } from './reportCsv';

const bom = '﻿';

describe('toCsv', () => {
	it('starts with a byte-order mark so Excel reads non-ASCII names correctly', () => {
		expect(toCsv(['name'], [['أحمد']])).toBe(`${bom}name\r\nأحمد\r\n`);
	});

	it('quotes fields containing a comma, quote, or line break', () => {
		const csv = toCsv(['a', 'b', 'c'], [['one, two', 'she said "hi"', 'first\nsecond']]);

		expect(csv).toBe(`${bom}a,b,c\r\n"one, two","she said ""hi""","first\nsecond"\r\n`);
	});

	it('quotes a leading formula character so a spreadsheet treats it as text', () => {
		expect(toCsv(['phone'], [['=1+1']])).toContain('"=1+1"');
		expect(toCsv(['phone'], [['+15105550123']])).toContain('"+15105550123"');
	});

	it('writes an empty field for null and undefined rather than the word', () => {
		expect(toCsv(['a', 'b'], [[null, undefined]])).toBe(`${bom}a,b\r\n,\r\n`);
	});

	it('leaves ordinary numbers and text unquoted', () => {
		expect(toCsv(['count'], [[42]])).toBe(`${bom}count\r\n42\r\n`);
	});

	it('renders a header-only file when there are no rows', () => {
		expect(toCsv(['a'], [])).toBe(`${bom}a\r\n`);
	});
});

describe('csvFilename', () => {
	it('names the file after the report and its range', () => {
		expect(csvFilename('session-summary', '2026-01-01', '2026-08-08')).toBe(
			'session-summary_2026-01-01_2026-08-08.csv',
		);
	});
});
