import { describe, expect, it } from 'vitest';

import { formatUsPhone, isSamePhone } from './phoneFormat';

describe('formatUsPhone', () => {
	it('formats a complete number', () => {
		expect(formatUsPhone('5551234567')).toBe('(555) 123-4567');
	});

	it('formats progressively as digits arrive', () => {
		expect(formatUsPhone('5')).toBe('(5');
		expect(formatUsPhone('555')).toBe('(555');
		expect(formatUsPhone('5551')).toBe('(555) 1');
		expect(formatUsPhone('555123')).toBe('(555) 123');
		expect(formatUsPhone('5551234')).toBe('(555) 123-4');
	});

	it('strips non-digit characters already added by the mask', () => {
		expect(formatUsPhone('(555) 123-4567')).toBe('(555) 123-4567');
	});

	it('drops a leading country code digit', () => {
		expect(formatUsPhone('15551234567')).toBe('(555) 123-4567');
	});

	it('ignores digits past the tenth', () => {
		expect(formatUsPhone('55512345679999')).toBe('(555) 123-4567');
	});

	it('returns an empty string for no digits', () => {
		expect(formatUsPhone('')).toBe('');
		expect(formatUsPhone('abc')).toBe('');
	});
});

describe('isSamePhone', () => {
	it('matches the same number however it is punctuated', () => {
		// Arrange
		const onFile = '(925) 555-0100';

		// Act
		const matches = ['9255550100', '925-555-0100', '+1 925 555 0100'].map((typed) =>
			isSamePhone(typed, onFile),
		);

		// Assert
		expect(matches).toEqual([true, true, true]);
	});

	it('refuses a partial or different number', () => {
		// Arrange
		const onFile = '(925) 555-0100';

		// Act
		const matches = ['555-0100', '925-555-0101', ''].map((typed) => isSamePhone(typed, onFile));

		// Assert
		expect(matches).toEqual([false, false, false]);
	});
});
