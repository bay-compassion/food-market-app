import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { assembleDocument } from './assemble-document.mjs';
import type { PrintedPage } from './docs-printer.mjs';

async function printedPage(label: string, pages: number): Promise<PrintedPage> {
	const document = await PDFDocument.create();

	for (let count = 0; count < pages; count += 1) {
		document.addPage([612, 792]);
	}

	return {
		page: { id: `${label}--docs`, title: `Guest/${label}`, label, kind: 'section' },
		pdf: await document.save(),
		pages,
		figures: 0,
	};
}

describe('assembleDocument', () => {
	it('joins every page, in the order given', async () => {
		// Arrange
		const printed = [await printedPage('Intro', 1), await printedPage('Forms', 3)];

		// Act
		const document = await PDFDocument.load(await assembleDocument(printed));

		// Assert
		expect(document.getPageCount()).toBe(4);
	});

	it('numbers every page after the first, and only those', async () => {
		// Arrange
		const printed = [await printedPage('Intro', 1), await printedPage('Forms', 2)];

		// Act
		const document = await PDFDocument.load(await assembleDocument(printed));
		const marked = document.getPages().map((page) => page.node.Contents() !== undefined);

		// Assert
		expect(marked).toEqual([false, true, true]);
	});
});
