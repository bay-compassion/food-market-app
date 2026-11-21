/**
 * The seven minimum categories of OMB's 2024 Statistical Policy Directive No. 15, in its order.
 * Matching the federal list is what lets the market's counts sit beside Census and grantor figures.
 */
export const federalRaceEthnicityCategories = [
	'american_indian_alaska_native',
	'asian',
	'black_african_american',
	'hispanic_latino',
	'middle_eastern_north_african',
	'native_hawaiian_pacific_islander',
	'white',
] as const;

/** Every answer a guest can tick: the federal categories, a self-described one, and declining. */
export const raceEthnicityCodes = [
	...federalRaceEthnicityCategories,
	'another',
	'prefer_not_to_answer',
] as const;

export type FederalRaceEthnicityCategory = (typeof federalRaceEthnicityCategories)[number];
export type RaceEthnicityCode = (typeof raceEthnicityCodes)[number];

/**
 * What is wrong with an answer. A code rather than a sentence, so the guest's phone words it in
 * their language.
 */
export type RaceEthnicityIssue = 'other-text-required' | 'other-text-too-long';

/** One row a person counts toward in an aggregate report. */
export type RaceEthnicityReportValue =
	| FederalRaceEthnicityCategory
	| 'another'
	| 'multiple'
	| 'prefer_not_to_answer'
	| 'not_asked';

/** An answer as it is sent and stored: the ticked codes, and the self-description if `another`. */
export type RaceEthnicityAnswer = {
	codes: RaceEthnicityCode[];
	otherText: string | null;
};

export function isRaceEthnicityCode(value: unknown): value is RaceEthnicityCode {
	return raceEthnicityCodes.includes(value as RaceEthnicityCode);
}

/**
 * How a guest describes themselves. "Prefer not to answer" excludes every other choice, and the
 * free-text self-description belongs to "Some other race and/or ethnicity" alone.
 *
 * A value object, free of MobX and the DOM: the registration form and the server check an answer
 * through it, and reports bucket a stored one with it, so none of them can disagree.
 */
export class RaceEthnicity {
	/** Matches the `race_ethnicity_other` column's constraint. */
	static readonly otherTextMaxLength = 100;

	static readonly empty = new RaceEthnicity([], '');

	readonly codes: readonly RaceEthnicityCode[];
	private readonly otherText: string;

	constructor(codes: readonly string[], otherText: string | null = '') {
		const chosen = new Set(codes.filter(isRaceEthnicityCode));

		// Declining wins over anything sent alongside it.
		this.codes = chosen.has('prefer_not_to_answer')
			? ['prefer_not_to_answer']
			: raceEthnicityCodes.filter((code) => chosen.has(code));
		this.otherText = otherText ?? '';
	}

	/** Builds one from stored columns; `null` codes mean the guest was never asked. */
	static fromStored(codes: readonly string[] | null, otherText: string | null): RaceEthnicity {
		return new RaceEthnicity(codes ?? [], otherText);
	}

	has(code: RaceEthnicityCode): boolean {
		return this.codes.includes(code);
	}

	/** Ticks or unticks one choice. Ticking "Prefer not to answer" clears the rest, and the reverse. */
	toggle(code: RaceEthnicityCode): RaceEthnicity {
		if (this.has(code)) {
			return new RaceEthnicity(
				this.codes.filter((existing) => existing !== code),
				this.otherText,
			);
		}

		if (code === 'prefer_not_to_answer') {
			return new RaceEthnicity([code], this.otherText);
		}

		return new RaceEthnicity(
			[...this.codes.filter((existing) => existing !== 'prefer_not_to_answer'), code],
			this.otherText,
		);
	}

	withOtherText(otherText: string): RaceEthnicity {
		return new RaceEthnicity(this.codes, otherText);
	}

	/** The self-description as the field holds it, so typing is never interrupted by trimming. */
	get otherTextInput(): string {
		return this.otherText;
	}

	get isAnswered(): boolean {
		return this.codes.length > 0;
	}

	get issue(): RaceEthnicityIssue | null {
		if (!this.has('another')) {
			return null;
		}

		const text = this.otherText.trim();

		if (text === '') {
			return 'other-text-required';
		}

		return text.length > RaceEthnicity.otherTextMaxLength ? 'other-text-too-long' : null;
	}

	get isValid(): boolean {
		return this.issue === null;
	}

	/** What is sent and stored. Text typed before "Some other race and/or ethnicity" was unticked is dropped. */
	get answer(): RaceEthnicityAnswer {
		return {
			codes: [...this.codes],
			otherText: this.has('another') ? this.otherText.trim() : null,
		};
	}

	/**
	 * The rows this answer counts toward. Each identity is counted "alone or in combination", so a
	 * person who ticks two counts toward both and toward `multiple` — the rows add up to more than
	 * the number of people, as federal tabulations do.
	 */
	static reportValues(codes: readonly string[] | null): RaceEthnicityReportValue[] {
		if (codes === null || codes.length === 0) {
			return ['not_asked'];
		}

		const answer = new RaceEthnicity(codes);

		if (answer.has('prefer_not_to_answer')) {
			return ['prefer_not_to_answer'];
		}

		const identities = answer.codes.filter(
			(code): code is FederalRaceEthnicityCategory | 'another' => code !== 'prefer_not_to_answer',
		);

		return identities.length > 1 ? [...identities, 'multiple'] : identities;
	}
}
