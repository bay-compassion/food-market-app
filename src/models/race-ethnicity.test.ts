import { describe, expect, it } from 'vitest';

import { RaceEthnicity } from './race-ethnicity';

describe('RaceEthnicity', () => {
	it('starts unanswered', () => {
		// Arrange
		const answer = RaceEthnicity.empty;

		// Act
		const { isAnswered, isValid } = answer;

		// Assert
		expect(isAnswered).toBe(false);
		expect(isValid).toBe(true);
	});

	it('keeps several identities, in federal order', () => {
		// Arrange
		const answer = RaceEthnicity.empty;

		// Act
		const result = answer.toggle('white').toggle('asian');

		// Assert
		expect(result.codes).toEqual(['asian', 'white']);
	});

	it('clears every other choice when the guest prefers not to answer', () => {
		// Arrange
		const answer = RaceEthnicity.empty.toggle('asian').toggle('white');

		// Act
		const result = answer.toggle('prefer_not_to_answer');

		// Assert
		expect(result.codes).toEqual(['prefer_not_to_answer']);
	});

	it('clears "prefer not to answer" when the guest then ticks an identity', () => {
		// Arrange
		const answer = RaceEthnicity.empty.toggle('prefer_not_to_answer');

		// Act
		const result = answer.toggle('hispanic_latino');

		// Assert
		expect(result.codes).toEqual(['hispanic_latino']);
	});

	it('unticks a choice that is already ticked', () => {
		// Arrange
		const answer = RaceEthnicity.empty.toggle('asian');

		// Act
		const result = answer.toggle('asian');

		// Assert
		expect(result.isAnswered).toBe(false);
	});

	it('drops unknown and repeated codes, and lets declining win, when built from a request', () => {
		// Arrange
		const codes = ['white', 'white', 'martian', 'prefer_not_to_answer'];

		// Act
		const answer = new RaceEthnicity(codes);

		// Assert
		expect(answer.codes).toEqual(['prefer_not_to_answer']);
	});

	it('asks for a self-description when "some other race and/or ethnicity" is ticked', () => {
		// Arrange
		const answer = RaceEthnicity.empty.toggle('another').withOtherText('   ');

		// Act
		const { issue } = answer;

		// Assert
		expect(issue).toBe('other-text-required');
	});

	it('rejects a self-description longer than the column allows', () => {
		// Arrange
		const text = 'x'.repeat(RaceEthnicity.otherTextMaxLength + 1);
		const answer = RaceEthnicity.empty.toggle('another').withOtherText(text);

		// Act
		const { issue } = answer;

		// Assert
		expect(issue).toBe('other-text-too-long');
	});

	it('sends a trimmed self-description only with "some other race and/or ethnicity"', () => {
		// Arrange
		const withAnother = RaceEthnicity.empty.toggle('another').withOtherText('  Cape Verdean ');
		const withoutAnother = withAnother.toggle('another').toggle('white');

		// Act
		const kept = withAnother.answer;
		const dropped = withoutAnother.answer;

		// Assert
		expect(kept).toEqual({ codes: ['another'], otherText: 'Cape Verdean' });
		expect(dropped).toEqual({ codes: ['white'], otherText: null });
	});

	describe('reportValues', () => {
		it('reports a guest never asked as not asked', () => {
			// Arrange
			const codes = null;

			// Act
			const values = RaceEthnicity.reportValues(codes);

			// Assert
			expect(values).toEqual(['not_asked']);
		});

		it('counts each identity alone or in combination, plus multiple', () => {
			// Arrange
			const codes = ['black_african_american', 'hispanic_latino'];

			// Act
			const values = RaceEthnicity.reportValues(codes);

			// Assert
			expect(values).toEqual(['black_african_american', 'hispanic_latino', 'multiple']);
		});

		it('reports a single identity alone', () => {
			// Arrange
			const codes = ['another'];

			// Act
			const values = RaceEthnicity.reportValues(codes);

			// Assert
			expect(values).toEqual(['another']);
		});

		it('reports declining on its own', () => {
			// Arrange
			const codes = ['prefer_not_to_answer'];

			// Act
			const values = RaceEthnicity.reportValues(codes);

			// Assert
			expect(values).toEqual(['prefer_not_to_answer']);
		});
	});
});
