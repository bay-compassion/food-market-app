import { describe, expect, it } from 'vitest';

import { SessionProgress } from './session-progress.ts';

describe('SessionProgress', () => {
	it('counts everyone the lottery placed in today’s service', () => {
		// Arrange
		const counts = { waiting: 43, called: 4, served: 68, no_show: 5, not_placed: 12 };

		// Act
		const progress = new SessionProgress(counts);

		// Assert
		expect(progress.placed).toBe(120);
		expect(progress.served).toBe(68);
	});

	it('gives each pipeline status its share of the guests placed', () => {
		// Arrange
		const counts = { waiting: 25, called: 5, served: 50, no_show: 20 };

		// Act
		const { segments } = new SessionProgress(counts);

		// Assert
		expect(segments).toEqual([
			{ status: 'served', count: 50, percent: 50 },
			{ status: 'called', count: 5, percent: 5 },
			{ status: 'waiting', count: 25, percent: 25 },
			{ status: 'no_show', count: 20, percent: 20 },
		]);
	});

	it('spends the whole bar even when the shares do not divide evenly', () => {
		// Arrange
		const counts = { waiting: 1, called: 1, served: 1, no_show: 0 };

		// Act
		const { segments } = new SessionProgress(counts);

		// Assert
		expect(segments.reduce((total, segment) => total + segment.percent, 0)).toBeCloseTo(100, 10);
		expect(segments.every((segment) => segment.percent >= 0)).toBe(true);
	});

	it('leaves an empty status at zero rather than a floating-point crumb', () => {
		// Arrange
		const counts = { waiting: 20, called: 5, served: 10, no_show: 0 };

		// Act
		const { segments } = new SessionProgress(counts);

		// Assert
		expect(segments.at(-1)).toEqual({ status: 'no_show', count: 0, percent: 0 });
	});

	it('leaves the bar empty before anyone has been placed', () => {
		// Arrange
		const counts = { registered: 8 };

		// Act
		const { placed, segments } = new SessionProgress(counts);

		// Assert
		expect(placed).toBe(0);
		expect(segments.map((segment) => segment.percent)).toEqual([0, 0, 0, 0]);
	});

	it('reports the statuses service is not working through', () => {
		// Arrange
		const counts = { served: 10, not_placed: 12, cancelled: 3 };

		// Act
		const { outsideService } = new SessionProgress(counts);

		// Assert
		expect(outsideService).toEqual([
			{ status: 'not_placed', count: 12 },
			{ status: 'cancelled', count: 3 },
			// A guest added at the counter after the lottery, so nobody is waiting on them yet.
			{ status: 'registered', count: 0 },
		]);
	});

	it('treats a status the session never reported as nobody', () => {
		// Arrange
		const counts = {};

		// Act
		const progress = new SessionProgress(counts);

		// Assert
		expect(progress.served).toBe(0);
		expect(progress.placed).toBe(0);
	});
});
