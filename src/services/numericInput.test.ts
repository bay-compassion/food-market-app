import { describe, expect, it } from 'vitest';

import { parseNumericInput } from './numericInput';

describe('parseNumericInput', () => {
	it('parses a plain integer', () => {
		expect(parseNumericInput('3')).toBe(3);
	});

	it('keeps the empty string instead of returning NaN', () => {
		expect(parseNumericInput('')).toBe('');
	});

	it('returns the original text when it is not a number', () => {
		expect(parseNumericInput('abc')).toBe('abc');
	});
});
