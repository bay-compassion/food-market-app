import { PDFDocument } from 'pdf-lib';
import type { Browser, Page } from 'playwright';

import type { Locale } from '../../src/locales.js';
import { launchChromium } from './chromium.mjs';
import type { PrintLayout } from './print-layout.mjs';
import { stillsClock, stillsTimeZone } from './scene-fixtures.mjs';
import { docsUrl, type ReviewDoc } from './storybook-server.mjs';

/** A docs page, printed. */
export type PrintedDoc = {
	doc: ReviewDoc;
	pdf: Uint8Array;
	pages: number;
	/** How many stories the page embeds, so a page that printed short of them is visible in the run. */
	figures: number;
};

/**
 * The room left either side of a page's words, so there is somewhere to write. It is the same on
 * every page, and wider than the stills' margin: prose is read down a narrow column, and a reviewer
 * has more to say beside a paragraph than beside a picture.
 */
const sideMarginIn = 1.4;

/** Room for the running header, and for the page number that sits in the footer's place. */
const verticalMarginIn = 0.75;

/**
 * Print zoom. A docs page is laid out for a screen, at roughly a browser window's width; at full
 * size a phone-wide story is most of a page tall and the type is larger than paper needs. 0.8 puts
 * every story in this app on a page of its own height or less, bar the very longest, while the
 * type stays readable.
 */
const zoom = 0.8;

/**
 * How long a page is given to render every story it embeds. Generous on purpose: Storybook compiles
 * a story the first time it is asked for, so a page printed straight after Storybook starts is far
 * slower than one printed a minute later.
 */
const renderTimeoutMs = 120_000;

/** How long a page must go without changing before it is taken to be finished drawing. */
const quietMs = 1_500;

function escapeHtml(value: string): string {
	return value.replace(
		/[&<>"]/g,
		(character) =>
			({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character] ?? character,
	);
}

/**
 * What a docs page needs in order to come off a printer as part of the document: nothing but the
 * words and stories, a number on every story so a reviewer can quote it, and stories kept whole
 * where a page can hold them.
 */
function printCss(sectionNumber: number): string {
	return `
		html, body { background: #fff !important; }
		.sbdocs-wrapper { padding: 0 !important; min-height: 0 !important; }
		.sbdocs-content { max-width: none !important; padding: 0 !important; }
		/* A heading, and the paragraph that introduces a figure, stay on the page with what follows. */
		.sbdocs-content h1, .sbdocs-content h2, .sbdocs-content h3, .sbdocs-content p { break-after: avoid; break-inside: avoid; }
		/* A diagram is a picture, and one this tall would take a page to itself. */
		.sbdocs-content svg[id^='mermaid'], .sbdocs-content .mermaid svg {
			display: block; margin: 0 auto; max-height: 700px; width: auto; max-width: 100%;
		}
		body { counter-reset: figure; }
		.sb-story {
			counter-increment: figure;
			break-inside: avoid;
			margin: 0.1in 0 0.3in;
		}
		.sb-story::before {
			content: '${sectionNumber}.' counter(figure);
			display: block;
			margin-bottom: 6px;
			font: 700 9pt/1.2 -apple-system, 'Segoe UI', Helvetica, sans-serif;
			color: #111;
			text-align: center;
		}
	`;
}

/** CSS pixels to an inch, which is the unit a printed page's size is turned into. */
const cssPxPerInch = 96;

/**
 * The tallest a story can be and still sit on a page whole, in the page's own pixels: the page
 * less its margins, at print zoom, less room for the story's number and the space around it.
 */
function storyHeightLimitPx(layout: PrintLayout): number {
	const roomIn = layout.pageHeightIn - 2 * verticalMarginIn;

	return (roomIn * cssPxPerInch) / zoom - 60;
}

/**
 * Shrinks any story taller than a page to fit one. A page cannot hold a story that is taller than
 * itself, so left alone it splits across two, and the tail — a footer, a button — is stranded on
 * a page of its own. Runs in the page.
 */
function fitStoriesToPage(limitPx: number): void {
	for (const story of document.querySelectorAll<HTMLElement>('.sb-story')) {
		const height = story.getBoundingClientRect().height;

		if (height > limitPx) {
			story.style.zoom = String(limitPx / height);
		}
	}
}

/**
 * Prints the review docs — the MDX pages — from Storybook, so the document's prose is written where
 * the components are, and the stories on a page are the components themselves rather than pictures
 * described by a script.
 */
export class DocsPrinter {
	private constructor(
		private readonly browser: Browser,
		private readonly baseUrl: string,
		private readonly locale: Locale,
		private readonly layout: PrintLayout,
	) {}

	static async open(options: {
		baseUrl: string;
		locale: Locale;
		layout: PrintLayout;
	}): Promise<DocsPrinter> {
		return new DocsPrinter(await launchChromium(), options.baseUrl, options.locale, options.layout);
	}

	/** Prints one page. Throws if Storybook shows an error instead of it. */
	async print(doc: ReviewDoc, sectionNumber: number): Promise<PrintedDoc> {
		const { layout } = this;
		const context = await this.browser.newContext({
			// Wide enough that the page lays out as it would on a desktop screen, not as a phone.
			viewport: { width: 900, height: 1200 },
			colorScheme: 'light',
			reducedMotion: 'reduce',
			locale: this.locale,
			timezoneId: stillsTimeZone,
		});

		try {
			await context.clock.setFixedTime(stillsClock);

			const page = await context.newPage();

			await page.goto(docsUrl(this.baseUrl, doc.id, { locale: this.locale, appFrame: 'on' }), {
				waitUntil: 'domcontentloaded',
			});
			await page.waitForSelector('.sbdocs-content, .sb-errordisplay', { state: 'attached' });

			const failure = await page.evaluate(() =>
				document.body.classList.contains('sb-show-errordisplay')
					? (document.querySelector('#error-message')?.textContent?.trim() ?? 'unknown error')
					: null,
			);

			if (failure !== null) {
				throw new Error(`Storybook could not render “${doc.title}” (${doc.id}): ${failure}`);
			}

			await this.untilRendered(page, doc);

			await page.addStyleTag({ content: printCss(sectionNumber) });
			await page.emulateMedia({ media: 'print' });
			await page.evaluate(fitStoriesToPage, storyHeightLimitPx(layout));

			const pdf = await page.pdf({
				width: `${layout.pageWidthIn}in`,
				height: `${layout.pageHeightIn}in`,
				margin: {
					top: `${verticalMarginIn}in`,
					bottom: `${verticalMarginIn}in`,
					left: `${sideMarginIn}in`,
					right: `${sideMarginIn}in`,
				},
				scale: zoom,
				printBackground: true,
				displayHeaderFooter: true,
				headerTemplate: `<div style="width:100%;padding:0 ${sideMarginIn}in;font:8px -apple-system,Helvetica,sans-serif;color:#666;display:flex;justify-content:space-between">
					<span><b style="color:#111">${sectionNumber}</b>&nbsp; ${escapeHtml(doc.label)}</span>
					<span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
				</div>`,
				footerTemplate: '<div></div>',
			});

			return {
				doc,
				pdf,
				pages: (await PDFDocument.load(pdf)).getPageCount(),
				figures: await page.evaluate(() => document.querySelectorAll('.sb-story').length),
			};
		} finally {
			await context.close();
		}
	}

	/**
	 * Waits until every story on the page has drawn something and the page has stopped changing.
	 *
	 * A story that has not rendered prints as an empty box, or not at all, and a page that is short
	 * a few figures looks finished — so "nothing has happened for a moment" is not evidence, and
	 * "every story has content" has to be. The quiet period after that is for what draws itself
	 * later, such as a diagram. A cold Storybook can also reload the page once while it finishes
	 * optimizing its dependencies, so a navigation in the middle of the wait starts it over.
	 */
	private async untilRendered(page: Page, doc: ReviewDoc): Promise<void> {
		for (let attempt = 0; ; attempt += 1) {
			try {
				await page.waitForFunction(
					() => {
						const stories = [...document.querySelectorAll<HTMLElement>('.sb-story')];

						return (
							document.querySelector('.sbdocs-content') !== null &&
							stories.every((story) => story.innerText.trim().length > 0)
						);
					},
					undefined,
					{ timeout: renderTimeoutMs },
				);
				await page.evaluate(() => document.fonts.ready);
				await page.evaluate(
					(quiet) =>
						new Promise<void>((resolve) => {
							let timer = setTimeout(resolve, quiet);
							// Structure and text only: a spinner turning changes attributes forever.
							const observer = new MutationObserver(() => {
								clearTimeout(timer);
								timer = setTimeout(resolve, quiet);
							});

							observer.observe(document.body, {
								childList: true,
								subtree: true,
								characterData: true,
							});
						}),
					quietMs,
				);

				return;
			} catch (error) {
				const navigated = String(error).includes('Execution context was destroyed');

				if (!navigated || attempt >= 3) {
					throw new Error(`“${doc.title}” (${doc.id}) did not finish rendering.`, {
						cause: error,
					});
				}
			}
		}
	}

	async [Symbol.asyncDispose](): Promise<void> {
		await this.browser.close();
	}
}
