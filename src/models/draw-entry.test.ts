import { describe, expect, it } from 'vitest';

import { DrawEntry, type DrawEntryVisit } from './draw-entry.ts';

function entry(overrides: Partial<DrawEntryVisit>) {
	return new DrawEntry({
		status: 'waiting',
		source: 'self',
		queuePosition: 4,
		hasDrawEvent: true,
		hasHistory: true,
		...overrides,
	});
}

describe('DrawEntry', () => {
	it('counts a worker-added guest the draw drew', () => {
		// Act
		const result = entry({ source: 'admin' });

		// Assert
		expect(result.entered).toBe(true);
		expect(result.won).toBe(true);
	});

	it('counts a miss as an entry without a number', () => {
		// Act
		const result = entry({ status: 'not_placed', queuePosition: null });

		// Assert
		expect(result.entered).toBe(true);
		expect(result.won).toBe(false);
	});

	it('leaves out a guest a worker placed straight into line', () => {
		// Act
		const result = entry({ source: 'admin', hasDrawEvent: false });

		// Assert
		expect(result.entered).toBe(false);
	});

	it('leaves out a visit still waiting on its draw', () => {
		// Act
		const result = entry({ status: 'registered', queuePosition: null, hasDrawEvent: false });

		// Assert
		expect(result.entered).toBe(false);
	});

	it('leaves out a guest who cancelled before the draw', () => {
		// Act
		const result = entry({ status: 'cancelled', queuePosition: null, hasDrawEvent: false });

		// Assert
		expect(result.entered).toBe(false);
	});

	it('leaves out a self-registered guest a worker selected into line', () => {
		// Act
		const result = entry({ hasDrawEvent: false });

		// Assert
		expect(result.entered).toBe(false);
	});

	it('counts an older self-registration with no history', () => {
		// Act
		const result = entry({ status: 'served', hasDrawEvent: false, hasHistory: false });

		// Assert
		expect(result.entered).toBe(true);
		expect(result.won).toBe(true);
	});
});
