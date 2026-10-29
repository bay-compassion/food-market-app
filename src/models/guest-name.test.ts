import { describe, expect, it } from 'vitest';

import { GuestName } from './guest-name';

describe('GuestName', () => {
	it.each(['', '   ', null, undefined])('requires a name when given %j', (input) => {
		// Arrange
		const name = new GuestName(input);

		// Act
		const { issue, isValid } = name;

		// Assert
		expect(issue).toBe('required');
		expect(isValid).toBe(false);
	});

	it.each(['J', 'j', 'J.', ' J. ', 'J.R.', 'J. R.', 'J R', 'J.-P.', 'И.', 'É'])(
		'refuses %j as initials only',
		(input) => {
			// Arrange
			const name = new GuestName(input);

			// Act
			const { issue } = name;

			// Assert
			expect(issue).toBe('initials-only');
		},
	);

	it.each([
		'Ng',
		'Le',
		'Vo',
		'Li',
		'Al',
		'JR',
		'Mary J.',
		"O'Neil",
		'Jean-Luc',
		'Nguyễn',
		'王',
		'김',
		'محمد',
		'Иван',
	])('accepts %j as a name', (input) => {
		// Arrange
		const name = new GuestName(input);

		// Act
		const { issue, isValid } = name;

		// Assert
		expect(issue).toBeNull();
		expect(isValid).toBe(true);
	});
});
