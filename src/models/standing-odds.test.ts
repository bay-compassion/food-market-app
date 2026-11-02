import { describe, expect, it } from 'vitest';

import { StandingOdds, type OddsChange } from './standing-odds.ts';

const draw = { id: 'event-2', registrationOpensAt: new Date('2026-11-07T17:30:00Z') };

function change(overrides: Partial<OddsChange>): OddsChange {
	return {
		weight: 2,
		marketEventId: null,
		endsAt: null,
		createdAt: new Date('2026-10-01T00:00:00Z'),
		...overrides,
	};
}

describe('StandingOdds', () => {
	it('has nothing to say about a person with no changes', () => {
		// Act
		const weight = new StandingOdds([]).weightFor(draw);

		// Assert
		expect(weight).toBeNull();
	});

	it('lets the newest change win', () => {
		// Arrange
		const changes = [
			change({ weight: 5, createdAt: new Date('2026-10-20T00:00:00Z') }),
			change({ weight: 2, createdAt: new Date('2026-10-01T00:00:00Z') }),
		];

		// Act
		const weight = new StandingOdds(changes).weightFor(draw);

		// Assert
		expect(weight).toBe(5);
	});

	it('honors a change that holds someone at Standard', () => {
		// Arrange
		const changes = [
			change({ weight: 5, createdAt: new Date('2026-10-01T00:00:00Z') }),
			change({ weight: 1, createdAt: new Date('2026-10-20T00:00:00Z') }),
		];

		// Act
		const weight = new StandingOdds(changes).weightFor(draw);

		// Assert
		expect(weight).toBe(1);
	});

	it('ignores a change that has ended', () => {
		// Arrange
		const changes = [change({ endsAt: new Date('2026-11-01T00:00:00Z') })];

		// Act
		const weight = new StandingOdds(changes).weightFor(draw);

		// Assert
		expect(weight).toBeNull();
	});

	it('falls back to the standing setting after a one-session change', () => {
		// Arrange
		const changes = [
			change({ weight: 2, createdAt: new Date('2026-10-01T00:00:00Z') }),
			change({
				weight: 5,
				marketEventId: 'event-1',
				createdAt: new Date('2026-10-20T00:00:00Z'),
			}),
		];

		// Act
		const weight = new StandingOdds(changes).weightFor(draw);

		// Assert
		expect(weight).toBe(2);
	});
});
