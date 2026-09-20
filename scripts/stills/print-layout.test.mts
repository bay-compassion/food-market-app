import { describe, expect, it } from 'vitest';

import { defaultPrintLayoutOptions, PrintLayout, type PlacedStill } from './print-layout.mjs';

function layout(overrides: Partial<typeof defaultPrintLayoutOptions> = {}) {
	return new PrintLayout({ ...defaultPrintLayoutOptions, ...overrides });
}

/** A stand-in placement, so pagination can be exercised without measuring a real still. */
function placement(columnSpan: number): PlacedStill {
	return { widthIn: 1, heightIn: 1, columnSpan };
}

describe('PrintLayout', () => {
	it('takes the trim margin off both edges of the paper', () => {
		// Arrange
		const sheet = layout({ paper: 'letter', marginIn: 0.5 });

		// Act
		const { contentWidthIn, contentHeightIn } = sheet;

		// Assert
		expect(contentWidthIn).toBeCloseTo(7.5);
		expect(contentHeightIn).toBeCloseTo(10);
	});

	it('turns the page on its side in landscape', () => {
		// Arrange
		const sheet = layout({ paper: 'letter', orientation: 'landscape' });

		// Act & Assert
		expect(sheet.pageWidthIn).toBeCloseTo(11);
		expect(sheet.pageHeightIn).toBeCloseTo(8.5);
	});

	it('divides the printable width into columns and gutters that add back up', () => {
		// Arrange
		const sheet = layout({ columns: 4, gapIn: 0.2 });

		// Act
		const total = 4 * sheet.cellWidthIn + 3 * 0.2;

		// Assert
		expect(total).toBeCloseTo(sheet.contentWidthIn);
	});

	it('leaves the running heading its own band above the grid', () => {
		// Arrange
		const sheet = layout({ headerHeightIn: 0.5, rows: 2, gapIn: 0.2 });

		// Act
		const total = 2 * sheet.cellHeightIn + 0.2 + 0.5;

		// Assert
		expect(total).toBeCloseTo(sheet.contentHeightIn);
	});

	it('scales a tall still down until it fits inside its cell', () => {
		// Arrange
		const sheet = layout();

		// Act
		const placed = sheet.place({ width: 390, height: 2000 });

		// Assert
		expect(placed.heightIn).toBeLessThanOrEqual(sheet.stillHeightIn + 1e-9);
		expect(placed.widthIn).toBeLessThanOrEqual(sheet.cellWidthIn + 1e-9);
		expect(placed.widthIn / placed.heightIn).toBeCloseTo(390 / 2000);
	});

	it('never enlarges a cell to fit a still, whatever the still measures', () => {
		// Arrange
		const sheet = layout();
		const sizes = [
			{ width: 390, height: 844 },
			{ width: 390, height: 2532 },
			{ width: 1280, height: 860 },
			{ width: 3258, height: 795 },
		];

		// Act
		const placements = sizes.map((size) => sheet.place(size));

		// Assert
		for (const placed of placements) {
			expect(placed.heightIn).toBeLessThanOrEqual(sheet.stillHeightIn + 1e-9);
			expect(placed.widthIn).toBeLessThanOrEqual(sheet.contentWidthIn + 1e-9);
		}
	});

	it('gives a still wider than a phone the whole row rather than one column', () => {
		// Arrange
		const sheet = layout({ columns: 3 });

		// Act
		const dashboard = sheet.place({ width: 1280, height: 860 });
		const screen = sheet.place({ width: 390, height: 844 });
		const strip = sheet.place({ width: 390, height: 110 });

		// Assert
		expect(dashboard.columnSpan).toBe(3);
		expect(dashboard.widthIn).toBeGreaterThan(sheet.cellWidthIn);
		expect(screen.columnSpan).toBe(1);
		// Short and wide, but only as wide as a phone: it belongs in the grid with its neighbours.
		expect(strip.columnSpan).toBe(1);
	});

	it('prints a short still at the same scale as a phone screen rather than enlarging it to fit', () => {
		// Arrange
		const sheet = layout({ columns: 1, rows: 1 });

		// Act
		const screen = sheet.place({ width: 390, height: 844 });
		const message = sheet.place({ width: 390, height: 400 });

		// Assert
		expect(message.widthIn).toBeCloseTo(screen.widthIn);
		expect(message.heightIn).toBeLessThan(screen.heightIn);
	});

	it('refuses a grid the paper cannot carry', () => {
		// Arrange
		const sheet = layout({ rows: 40 });

		// Act & Assert
		expect(() => sheet.assertUsable()).toThrow(/does not fit/);
		expect(sheet.isUsable).toBe(false);
	});

	it('fills every cell on a sheet before starting the next', () => {
		// Arrange
		const sheet = layout({ columns: 3, rows: 2 });

		// Act
		const pages = sheet.paginate(Array.from({ length: 7 }, () => placement(1)));

		// Assert
		expect(pages).toEqual([[0, 1, 2, 3, 4, 5], [6]]);
	});

	it('moves a full-width still to its own row rather than splitting it', () => {
		// Arrange
		const sheet = layout({ columns: 3, rows: 2 });

		// Act
		const pages = sheet.paginate([placement(1), placement(1), placement(3), placement(1)]);

		// Assert
		expect(pages).toEqual([[0, 1, 2], [3]]);
	});

	it('produces no pages for no stills', () => {
		// Arrange
		const sheet = layout();

		// Act
		const pages = sheet.paginate([]);

		// Assert
		expect(pages).toEqual([]);
	});
});
