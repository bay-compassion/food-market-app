import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

import { sideMarginIn } from './docs-printer.mjs';
import type { PrintedPage } from './docs-printer.mjs';

const pointsPerInch = 72;

/** Where the page number sits: level with the running header, at the right-hand margin. */
const numberFromTopIn = 0.18;

/**
 * Joins the printed pages, in the order given, into the one document, and stamps `Page n of N` on
 * every page but the first. Each page was printed on its own and cannot know where it landed, and
 * the contents page can only list page numbers once every section's length is known, so the
 * numbers are put on last, here.
 */
export async function assembleDocument(printed: readonly PrintedPage[]): Promise<Uint8Array> {
	const document = await PDFDocument.create();
	const font = await document.embedFont(StandardFonts.Helvetica);

	for (const { pdf } of printed) {
		const source = await PDFDocument.load(pdf);

		for (const page of await document.copyPages(source, source.getPageIndices())) {
			document.addPage(page);
		}
	}

	const pages = document.getPages();

	for (const [index, page] of pages.entries()) {
		// The title page is a title page, and carries no number.
		if (index === 0) {
			continue;
		}

		const { width, height } = page.getSize();
		const text = `Page ${index + 1} of ${pages.length}`;
		const size = 8;

		page.drawText(text, {
			x: width - sideMarginIn * pointsPerInch - font.widthOfTextAtSize(text, size),
			y: height - numberFromTopIn * pointsPerInch - size,
			size,
			font,
			color: rgb(0.4, 0.4, 0.4),
		});
	}

	return document.save();
}
