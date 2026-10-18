/** The three counts a visit records about who the guest is shopping for. */
export type HouseholdCount = 'householdSize' | 'childrenCount' | 'seniorsCount';

/**
 * What is wrong with one count. A code rather than a sentence: the guest's phone words it in their
 * language, and the server reports it back by the same name.
 */
export type HouseholdIssue =
	| 'required'
	| 'not-whole-number'
	| 'out-of-range'
	| 'exceeds-household'
	| 'no-adult';

/** A count as a form holds it — `''` while unanswered — or as it arrives in a request body. */
export type HouseholdCountInput = number | string | null | undefined;

/** A count may be missing outright, as from a request that left it out; that is `required`. */
export type HouseholdCounts = Partial<Record<HouseholdCount, HouseholdCountInput>>;

export type HouseholdCountRange = { min: number; max: number };

export const householdCounts: readonly HouseholdCount[] = [
	'householdSize',
	'childrenCount',
	'seniorsCount',
];

/**
 * Who a guest is shopping for: everyone in the household, and how many of them are children or
 * seniors. Children and seniors are separate age groups within the household, so together they
 * can be no more than the household itself — and the guest counts among the seniors when they are
 * one. Children cannot shop on their own, so a household that is all children has no one to shop
 * for it. A guest can still misreport their household; this only keeps the form from accepting one
 * that is impossible on its face.
 *
 * A value object, free of MobX and the DOM: the registration form and the server both check a
 * submission through it, so the two cannot disagree about what a valid household is.
 */
export class HouseholdComposition {
	/** What a fresh form starts from: a guest shopping for themselves alone. */
	static readonly defaults: Readonly<Record<HouseholdCount, number>> = {
		householdSize: 1,
		childrenCount: 0,
		seniorsCount: 0,
	};

	/** Matches the household columns' database constraints. A household always includes the guest. */
	static readonly ranges: Readonly<Record<HouseholdCount, HouseholdCountRange>> = {
		householdSize: { min: 1, max: 30 },
		childrenCount: { min: 0, max: 30 },
		seniorsCount: { min: 0, max: 30 },
	};

	constructor(private readonly counts: HouseholdCounts) {}

	/** The first problem with each count that has one. Empty when the household is valid. */
	get issues(): Partial<Record<HouseholdCount, HouseholdIssue>> {
		const issues: Partial<Record<HouseholdCount, HouseholdIssue>> = {};

		for (const count of householdCounts) {
			const issue = HouseholdComposition.issueWith(this.counts[count], count);

			if (issue) {
				issues[count] = issue;
			}
		}

		// Comparing the counts only means something once each one is a valid number on its own.
		if (Object.keys(issues).length === 0) {
			const { householdSize, childrenCount, seniorsCount } = this.values;

			if (childrenCount + seniorsCount > householdSize) {
				issues.householdSize = 'exceeds-household';
			} else if (childrenCount >= householdSize) {
				issues.childrenCount = 'no-adult';
			}
		}

		return issues;
	}

	get isValid(): boolean {
		return Object.keys(this.issues).length === 0;
	}

	/** The counts as numbers. Meaningful only while `isValid`. */
	get values(): Record<HouseholdCount, number> {
		return {
			householdSize: Number(this.counts.householdSize),
			childrenCount: Number(this.counts.childrenCount),
			seniorsCount: Number(this.counts.seniorsCount),
		};
	}

	private static issueWith(
		input: HouseholdCountInput,
		count: HouseholdCount,
	): HouseholdIssue | null {
		if (input === null || input === undefined || String(input).trim() === '') {
			return 'required';
		}

		const value = Number(input);

		if (!Number.isInteger(value)) {
			return 'not-whole-number';
		}

		const { min, max } = HouseholdComposition.ranges[count];

		return value < min || value > max ? 'out-of-range' : null;
	}
}
