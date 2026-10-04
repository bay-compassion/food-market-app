import { describe, expect, it } from 'vitest';

import { LanguageRotation } from './language-rotation';

const rotation = LanguageRotation.evenly(['es', 'vi', 'zh'], 8_000);

describe('LanguageRotation', () => {
	it('gives each language an equal turn, in order', () => {
		// Arrange
		const times = [0, 7_999, 8_000, 15_999, 16_000, 23_999];

		// Act
		const locales = times.map((time) => rotation.localeAt(time));

		// Assert
		expect(locales).toEqual(['es', 'es', 'vi', 'vi', 'zh', 'zh']);
		expect(rotation.cycleMs).toBe(24_000);
	});

	it('weights a language by its own slot length', () => {
		// Arrange
		const weighted = new LanguageRotation([
			{ locale: 'es', durationMs: 20_000 },
			{ locale: 'vi', durationMs: 5_000 },
		]);

		// Act
		const locales = [19_999, 20_000].map((time) => weighted.localeAt(time));

		// Assert
		expect(locales).toEqual(['es', 'vi']);
	});

	it('repeats on wall-clock time, so every display shows the same language at once', () => {
		// Arrange
		const time = Date.UTC(2026, 9, 4, 18, 0, 0);

		// Act
		const later = rotation.localeAt(time + rotation.cycleMs * 1_000);

		// Assert
		expect(later).toBe(rotation.localeAt(time));
	});

	it('counts down to the next change, never to zero', () => {
		// Act
		const fromStart = rotation.msUntilNextChange(0);
		const atBoundary = rotation.msUntilNextChange(8_000);
		const justBefore = rotation.msUntilNextChange(23_999);

		// Assert
		expect([fromStart, atBoundary, justBefore]).toEqual([8_000, 8_000, 1]);
	});

	it('lists its languages in turn order', () => {
		// Assert
		expect(rotation.locales).toEqual(['es', 'vi', 'zh']);
	});

	it('holds a fixed language indefinitely', () => {
		// Arrange
		const fixed = LanguageRotation.fixed('zh');

		// Act
		const locales = [0, Date.now(), Date.now() + 86_400_000].map((time) => fixed.localeAt(time));

		// Assert
		expect(locales).toEqual(['zh', 'zh', 'zh']);
	});

	it('rejects an empty or zero-length schedule', () => {
		// Assert
		expect(() => new LanguageRotation([])).toThrow(RangeError);
		expect(() => new LanguageRotation([{ locale: 'en', durationMs: 0 }])).toThrow(RangeError);
	});
});
