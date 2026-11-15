import { describe, expect, it } from 'vitest';

import { matchesSessionConfirmation } from './session-deletion.ts';

describe('matchesSessionConfirmation', () => {
	it('matches the date and start time exactly as shown', () => {
		// Arrange
		const confirmation = '2026-11-14 09:30';

		// Act
		const matches = matchesSessionConfirmation('2026-11-14 09:30', confirmation);

		// Assert
		expect(matches).toBe(true);
	});

	it('forgives stray spaces around and between the date and time', () => {
		// Arrange
		const confirmation = '2026-11-14 09:30';

		// Act
		const matches = matchesSessionConfirmation('  2026-11-14   09:30 ', confirmation);

		// Assert
		expect(matches).toBe(true);
	});

	it('refuses another session’s time on the same day, and the date alone', () => {
		// Arrange
		const confirmation = '2026-11-14 09:30';

		// Act
		const otherSession = matchesSessionConfirmation('2026-11-14 14:00', confirmation);
		const dateOnly = matchesSessionConfirmation('2026-11-14', confirmation);

		// Assert
		expect(otherSession).toBe(false);
		expect(dateOnly).toBe(false);
	});
});
