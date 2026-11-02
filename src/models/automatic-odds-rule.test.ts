import { describe, expect, it } from 'vitest';

import { AutomaticOddsRule } from './automatic-odds-rule.ts';

describe('AutomaticOddsRule', () => {
	it.each([
		[0, 1],
		[1, 1],
		[2, 2],
		[3, 2],
		[4, 3],
		[9, 3],
	])('gives %i misses in a row a weight of %i', (misses, weight) => {
		// Act
		const result = new AutomaticOddsRule().weightFor(misses);

		// Assert
		expect(result).toBe(weight);
	});

	it('can be previewed with a higher top weight', () => {
		// Act
		const result = new AutomaticOddsRule(5).weightFor(4);

		// Assert
		expect(result).toBe(5);
	});
});
