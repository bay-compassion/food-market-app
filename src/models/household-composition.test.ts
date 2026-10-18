import { describe, expect, it } from 'vitest';

import { HouseholdComposition, type HouseholdCounts } from './household-composition';

function composition(counts: Partial<HouseholdCounts> = {}): HouseholdComposition {
	return new HouseholdComposition({ ...HouseholdComposition.defaults, ...counts });
}

describe('HouseholdComposition', () => {
	it('accepts the defaults, a guest shopping for themselves', () => {
		// Arrange
		const household = composition();

		// Act
		const { isValid, issues } = household;

		// Assert
		expect(isValid).toBe(true);
		expect(issues).toEqual({});
	});

	it('accepts children and seniors that exactly fill the household', () => {
		// Arrange
		const household = composition({ householdSize: 4, childrenCount: 1, seniorsCount: 3 });

		// Act
		const { isValid } = household;

		// Assert
		expect(isValid).toBe(true);
	});

	it('accepts counts sent as numeric strings', () => {
		// Arrange
		const household = composition({ householdSize: '3', childrenCount: '1', seniorsCount: '0' });

		// Act
		const { values } = household;

		// Assert
		expect(household.isValid).toBe(true);
		expect(values).toEqual({ householdSize: 3, childrenCount: 1, seniorsCount: 0 });
	});

	it('reports children and seniors that outnumber the household on the household size', () => {
		// Arrange
		const household = composition({ householdSize: 2, childrenCount: 2, seniorsCount: 1 });

		// Act
		const { issues } = household;

		// Assert
		expect(issues).toEqual({ householdSize: 'exceeds-household' });
	});

	it('reports a household of only children as having no adult, on the children count', () => {
		// Arrange
		const household = composition({ householdSize: 1, childrenCount: 1 });

		// Act
		const { issues } = household;

		// Assert
		expect(issues).toEqual({ childrenCount: 'no-adult' });
	});

	it('accepts a household with one adult among the children', () => {
		// Arrange
		const household = composition({ householdSize: 3, childrenCount: 2 });

		// Act
		const { isValid } = household;

		// Assert
		expect(isValid).toBe(true);
	});

	it('reports only the overcount when children and seniors outnumber the household', () => {
		// Arrange
		const household = composition({ householdSize: 1, childrenCount: 1, seniorsCount: 1 });

		// Act
		const { issues } = household;

		// Assert
		expect(issues).toEqual({ householdSize: 'exceeds-household' });
	});

	it('reports a fractional count as not a whole number', () => {
		// Arrange
		const household = composition({ householdSize: 2.5, seniorsCount: '0.5' });

		// Act
		const { issues } = household;

		// Assert
		expect(issues).toEqual({ householdSize: 'not-whole-number', seniorsCount: 'not-whole-number' });
	});

	it('reports a count that is not a number at all as not a whole number', () => {
		// Arrange
		const household = composition({ childrenCount: 'two' });

		// Act
		const { issues } = household;

		// Assert
		expect(issues).toEqual({ childrenCount: 'not-whole-number' });
	});

	it('reports an empty count as required rather than reading it as zero', () => {
		// Arrange
		const household = composition({ householdSize: '', childrenCount: null, seniorsCount: ' ' });

		// Act
		const { issues } = household;

		// Assert
		expect(issues).toEqual({
			householdSize: 'required',
			childrenCount: 'required',
			seniorsCount: 'required',
		});
	});

	it('reports counts outside their ranges', () => {
		// Arrange
		const household = composition({ householdSize: 0, childrenCount: -1, seniorsCount: 31 });

		// Act
		const { issues } = household;

		// Assert
		expect(issues).toEqual({
			householdSize: 'out-of-range',
			childrenCount: 'out-of-range',
			seniorsCount: 'out-of-range',
		});
	});

	it('does not compare the counts while one of them is invalid', () => {
		// Arrange
		const household = composition({ householdSize: 1, childrenCount: 3, seniorsCount: 1.5 });

		// Act
		const { issues } = household;

		// Assert
		expect(issues).toEqual({ seniorsCount: 'not-whole-number' });
	});
});
