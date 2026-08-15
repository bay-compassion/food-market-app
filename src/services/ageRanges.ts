export type AgeRange = '0-17' | '18-29' | '30-44' | '45-59' | '60-74' | '75+';

/** In display order; also the bucket boundaries `guestDemographics` reports against. */
export const ageRanges: AgeRange[] = ['0-17', '18-29', '30-44', '45-59', '60-74', '75+'];

export function isAgeRange(value: unknown): value is AgeRange {
	return ageRanges.includes(value as AgeRange);
}
