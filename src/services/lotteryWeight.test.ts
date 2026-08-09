import { describe, expect, it } from 'vitest';

import {
	isLotteryWeightTier,
	lotteryWeightFor,
	lotteryWeightTiers,
	maximumLotteryWeight,
	minimumLotteryWeight,
	normalizeLotteryWeight,
} from './lotteryWeight';

describe('lotteryWeightFor', () => {
	it('leaves the standard tier at even odds', () => {
		expect(lotteryWeightFor('standard')).toBe(minimumLotteryWeight);
	});

	it('increases with each tier', () => {
		const weights = lotteryWeightTiers.map((tier) => lotteryWeightFor(tier));

		expect(weights).toEqual([...weights].sort((first, second) => first - second));
		expect(new Set(weights).size).toBe(weights.length);
	});

	it('stays inside the range the database will accept', () => {
		for (const tier of lotteryWeightTiers) {
			expect(lotteryWeightFor(tier)).toBeGreaterThanOrEqual(minimumLotteryWeight);
			expect(lotteryWeightFor(tier)).toBeLessThanOrEqual(maximumLotteryWeight);
		}
	});
});

describe('isLotteryWeightTier', () => {
	it('accepts every declared tier and nothing else', () => {
		for (const tier of lotteryWeightTiers) {
			expect(isLotteryWeightTier(tier)).toBe(true);
		}
		expect(isLotteryWeightTier('urgent')).toBe(false);
		expect(isLotteryWeightTier(2)).toBe(false);
		expect(isLotteryWeightTier(undefined)).toBe(false);
	});
});

describe('normalizeLotteryWeight', () => {
	it('keeps a weight that is already in range', () => {
		expect(normalizeLotteryWeight(5)).toBe(5);
	});

	it.each([
		{ input: undefined, because: 'omitted' },
		{ input: null, because: 'null' },
		{ input: 'plenty', because: 'not a number' },
		{ input: Number.NaN, because: 'NaN' },
	])('falls back to even odds when the weight is $because', ({ input }) => {
		expect(normalizeLotteryWeight(input)).toBe(minimumLotteryWeight);
	});

	it('clamps a weight outside the range rather than rejecting it', () => {
		expect(normalizeLotteryWeight(0)).toBe(minimumLotteryWeight);
		expect(normalizeLotteryWeight(-40)).toBe(minimumLotteryWeight);
		expect(normalizeLotteryWeight(10_000)).toBe(maximumLotteryWeight);
	});

	it('truncates a fractional weight to an integer column', () => {
		expect(normalizeLotteryWeight(2.9)).toBe(2);
	});
});
