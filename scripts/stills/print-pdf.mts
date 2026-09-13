import { pathToFileURL } from 'node:url';

import { launchChromium } from './chromium.mjs';
import type { PrintLayout } from './print-layout.mjs';

/**
 * Prints the contact sheet to PDF at exactly the page size the layout was built for.
 * `preferCSSPageSize` is what makes the `@page` rule authoritative, so the PDF's pages are the
 * sheets the layout computed rather than whatever the printer defaults to.
 */
export async function renderPdf(
	htmlPath: string,
	pdfPath: string,
	layout: PrintLayout,
): Promise<void> {
	const browser = await launchChromium();

	try {
		const page = await browser.newPage();

		await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
		await page.emulateMedia({ media: 'print' });
		await page.pdf({
			path: pdfPath,
			printBackground: true,
			preferCSSPageSize: true,
			width: `${layout.pageWidthIn}in`,
			height: `${layout.pageHeightIn}in`,
			margin: { top: '0', right: '0', bottom: '0', left: '0' },
		});
	} finally {
		await browser.close();
	}
}
