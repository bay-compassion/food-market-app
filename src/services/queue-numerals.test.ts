import { describe, expect, it } from 'vitest';

import type { Locale } from '../locales';
import { QueueNumerals } from './queue-numerals';

describe('QueueNumerals', () => {
	it('writes Arabic in Eastern Arabic digits, whatever the runtime’s default for `ar`', () => {
		// Arrange
		const numerals = new QueueNumerals('ar');

		// Act
		const native = numerals.nativeOf(1456);

		// Assert
		expect(native).toBe('١٤٥٦');
	});

	it('writes Farsi in its own digits, which differ from Arabic’s for 4, 5, and 6', () => {
		// Arrange
		const numerals = new QueueNumerals('fa');

		// Act
		const native = numerals.nativeOf(1456);

		// Assert
		expect(native).toBe('۱۴۵۶');
	});

	it('has nothing extra for a language that writes Western digits', () => {
		// Arrange
		const locales: Locale[] = ['en', 'es', 'tl', 'vi', 'zh'];
		const numerals = locales.map((locale) => new QueueNumerals(locale));

		// Act
		const native = numerals.map((numeral) => [numeral.hasNativeDigits, numeral.nativeOf(12)]);

		// Assert
		expect(native).toEqual(Array.from({ length: 5 }, () => [false, null]));
	});

	it('puts both forms in a sentence, the language’s own first', () => {
		// Act
		const inline = [new QueueNumerals('ar').inline(31), new QueueNumerals('en').inline(31)];

		// Assert
		expect(inline).toEqual(['٣١ (31)', '31']);
	});
});
