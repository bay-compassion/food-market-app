/**
 * How likely a guest is to be drawn, relative to everyone else in the lottery.
 *
 * A worker never types a raw number: they pick a named tier, and each tier maps to a multiplier.
 * A guest weighted `higher` is twice as likely to be drawn as a `standard` one, and `highest` is
 * five times as likely — see `weightedShuffle` in `netlify/services/marketSession.ts` for how the
 * draw actually consumes this.
 */
export type LotteryWeightTier = 'standard' | 'higher' | 'highest';

export const lotteryWeightTiers: LotteryWeightTier[] = ['standard', 'higher', 'highest'];

const weightByTier: Record<LotteryWeightTier, number> = {
	standard: 1,
	higher: 2,
	highest: 5,
};

/** Matches the `visits_lottery_weight_check` constraint in the database. */
export const minimumLotteryWeight = 1;
export const maximumLotteryWeight = 100;

export function lotteryWeightFor(tier: LotteryWeightTier) {
	return weightByTier[tier];
}

export function isLotteryWeightTier(value: unknown): value is LotteryWeightTier {
	return lotteryWeightTiers.some((tier) => tier === value);
}

/** Clamps to the range the database will accept, so a bad payload cannot fail the insert. */
export function normalizeLotteryWeight(value: unknown) {
	const weight = Math.trunc(Number(value));

	if (!Number.isFinite(weight)) {
		return minimumLotteryWeight;
	}

	return Math.min(maximumLotteryWeight, Math.max(minimumLotteryWeight, weight));
}
