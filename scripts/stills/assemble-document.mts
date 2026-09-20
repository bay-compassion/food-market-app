import { PDFDocument } from 'pdf-lib';

import type { PrintedDoc } from './docs-printer.mjs';

/**
 * Puts the review document in reading order: the contents page, then the docs pages, then the
 * sheets of stills. The contact sheet is printed as one piece — cover first, its sections after —
 * so it is split at the cover to let the docs pages go between.
 */
export async function assembleDocument(
	sheets: Uint8Array,
	docs: readonly PrintedDoc[],
): Promise<Uint8Array> {
	const document = await PDFDocument.create();
	const contact = await PDFDocument.load(sheets);
	const [cover, ...rest] = await document.copyPages(contact, contact.getPageIndices());

	if (cover) {
		document.addPage(cover);
	}

	for (const { pdf } of docs) {
		const printed = await PDFDocument.load(pdf);

		for (const page of await document.copyPages(printed, printed.getPageIndices())) {
			document.addPage(page);
		}
	}

	for (const page of rest) {
		document.addPage(page);
	}

	return document.save();
}
