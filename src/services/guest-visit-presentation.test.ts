import { describe, expect, it } from 'vitest';

import { visitTakesPrecedence } from './guest-visit-presentation';

describe('visitTakesPrecedence', () => {
	it('lets a cancelled visit yield to open registration', () => {
		// Arrange
		const sessionStatus = 'registration_open';
		const visitStatus = 'cancelled';

		// Act
		const result = visitTakesPrecedence(sessionStatus, visitStatus);

		// Assert
		expect(result).toBe(false);
	});

	it.each(['registered', 'waiting', 'called', 'served', 'not_placed', 'no_show'] as const)(
		'lets a %s visit take precedence during registration',
		(visitStatus) => {
			// Act
			const result = visitTakesPrecedence('registration_open', visitStatus);

			// Assert
			expect(result).toBe(true);
		},
	);

	it('keeps the cancelled outcome once registration is closed', () => {
		// Act
		const result = visitTakesPrecedence('service_started', 'cancelled');

		// Assert
		expect(result).toBe(true);
	});

	it('does not take precedence without a visit', () => {
		// Act
		const result = visitTakesPrecedence('service_started', null);

		// Assert
		expect(result).toBe(false);
	});

	it('shows a premarket volunteer their visit before registration opens', () => {
		// Act
		const result = visitTakesPrecedence('scheduled', 'served');

		// Assert
		expect(result).toBe(true);
	});

	it.each([null, 'ended'] as const)('has no visit to show for a %s session', (sessionStatus) => {
		// Act
		const result = visitTakesPrecedence(sessionStatus, 'served');

		// Assert
		expect(result).toBe(false);
	});
});
