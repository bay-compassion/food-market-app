import { describe, expect, it } from 'vitest';

import { LanguageRotation } from './language-rotation';

const rotation = LanguageRotation.favoringFirst(['en', 'es', 'vi'], {
	firstMs: 20_000,
	restMs: 8_000,
});

describe('LanguageRotation', () => {
	it('gives the first language the longer turn, then each of the rest in order', () => {
		// Arrange
		const times = [0, 19_999, 20_000, 27_999, 28_000, 35_999];

		// Act
		const locales = times.map((time) => rotation.localeAt(time));

		// Assert
		expect(locales).toEqual(['en', 'en', 'es', 'es', 'vi', 'vi']);
		expect(rotation.cycleMs).toBe(36_000);
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
		const atBoundary = rotation.msUntilNextChange(20_000);
		const justBefore = rotation.msUntilNextChange(35_999);

		// Assert
		expect([fromStart, atBoundary, justBefore]).toEqual([20_000, 8_000, 1]);
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
