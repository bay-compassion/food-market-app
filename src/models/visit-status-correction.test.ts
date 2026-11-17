import { describe, expect, it } from 'vitest';

import { VisitStatusCorrection } from './visit-status-correction.ts';

describe('VisitStatusCorrection', () => {
	it('offers every finished status but the one the visit is in', () => {
		// Arrange
		const correction = new VisitStatusCorrection('no_show');

		// Act
		const targets = correction.targets;

		// Assert
		expect(targets).toEqual(['served', 'not_placed', 'cancelled']);
	});

	it('allows moves the queue itself refuses, such as a no-show to served', () => {
		// Arrange
		const correction = new VisitStatusCorrection('no_show');

		// Act
		const allowed = correction.allows('served');

		// Assert
		expect(allowed).toBe(true);
	});

	it.each(['registered', 'waiting', 'called'] as const)(
		'refuses %s, which nobody can be in once a session has ended',
		(status) => {
			// Arrange
			const correction = new VisitStatusCorrection('served');

			// Act
			const allowed = correction.allows(status);

			// Assert
			expect(allowed).toBe(false);
		},
	);

	it('refuses a correction to the status the visit is already in', () => {
		// Arrange
		const correction = new VisitStatusCorrection('served');

		// Act
		const allowed = correction.allows('served');

		// Assert
		expect(allowed).toBe(false);
	});

	it('offers every finished status to a visit left waiting', () => {
		// Arrange
		const correction = new VisitStatusCorrection('waiting');

		// Act
		const targets = correction.targets;

		// Assert
		expect(targets).toEqual(['served', 'not_placed', 'no_show', 'cancelled']);
	});

	it('clears the service time of a visit corrected away from served', () => {
		// Arrange
		const correction = new VisitStatusCorrection('served');

		// Act
		const changes = correction.changes('no_show');

		// Assert
		expect(changes).toEqual({ status: 'no_show', servedAt: null });
	});

	it('leaves the service time empty for a visit corrected to served', () => {
		// Arrange
		const correction = new VisitStatusCorrection('no_show');

		// Act
		const changes = correction.changes('served');

		// Assert
		expect(changes).toEqual({ status: 'served' });
	});
});
