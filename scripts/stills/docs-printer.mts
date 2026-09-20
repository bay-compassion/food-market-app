import { PDFDocument } from 'pdf-lib';
import type { Browser, Page } from 'playwright';

import type { ReviewContents, ReviewPage } from '../../.storybook/docs/review-index.js';
import type { Locale } from '../../src/locales.js';
import { launchChromium } from './chromium.mjs';
import type { PageSize } from './paper.mjs';
import { stillsClock, stillsTimeZone } from './scene-fixtures.mjs';
import { docsUrl } from './storybook-server.mjs';

/** A docs page, printed. */
export type PrintedPage = {
	page: ReviewPage;
	pdf: Uint8Array;
	pages: number;
	/** How many stories and stills the page embeds, so a page that printed short of them is visible. */
	figures: number;
};

/**
 * The room left either side of a page's words, so there is somewhere to write. It is the same on
 * every page: prose is read down a narrow column, and a reviewer has more to say beside a
 * paragraph than beside a picture.
 */
export const sideMarginIn = 1.4;

/** The margin round a full page, which needs every inch it can have. */
const fullPageMarginIn = 0.6;

/** Room for the running header. */
export const verticalMarginIn = 0.75;

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

/** CSS pixels to an inch, which is the unit a printed page's size is turned into. */
const cssPxPerInch = 96;

/** Everything a page embeds that the print numbers and keeps whole: a story, or a still. */
const figureSelector = '.sb-story, .review-figure';

function escapeHtml(value: string): string {
	return value.replace(
		/[&<>"]/g,
		(character) =>
			({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character] ?? character,
	);
}

/**
 * What a docs page needs in order to come off a printer as part of the document: nothing but the
 * words and figures, a number on every figure so a reviewer can quote it, and figures kept whole
 * where a page can hold them. Front matter has no number, so its figures, if any, have none.
 */
function printCss(sectionNumber: number | null, paper: PageSize): string {
	return `
		html, body { background: #fff !important; }
		.sbdocs-wrapper { padding: 0 !important; min-height: 0 !important; }
		.sbdocs-content { max-width: none !important; padding: 0 !important; }
		/* Keep every MDX heading with the next block without chaining whole paragraphs together. */
		.sbdocs-content :is(h1, h2, h3, h4, h5, h6) {
			break-after: avoid-page !important;
			page-break-after: avoid !important;
			break-inside: avoid-page;
		}
		.sbdocs-content p { break-inside: avoid-page; orphans: 3; widows: 3; }
		.sbdocs-content h2 + p:has(+ .review-state) { break-after: avoid-page; }
		/* A diagram is a picture, and one this tall would take a page to itself. */
		.sbdocs-content svg[id^='mermaid'], .sbdocs-content .mermaid svg {
			display: block; margin: 0 auto; max-height: 700px; width: auto; max-width: 100%;
		}
		/*
		 * A page of its own, with slim margins: for a figure that has to be read across the whole
		 * sheet, like a flowchart whose arrow labels are unreadable in a narrow column. The page
		 * property names a page in an at-page rule, and a named page can have margins of its own.
		 */
		@page fullpage { size: ${paper.widthIn}in ${paper.heightIn}in; margin: ${fullPageMarginIn}in; }
		.review-fullpage { page: fullpage; break-before: page; break-after: page; break-inside: avoid-page; }
		.review-fullpage svg {
			/* Mermaid sets its own maximum width in the element's style, and the general diagram rule above caps its height; only !important beats both. */
			display: block; margin: 0 auto; width: ${fullPageWidthPx(paper)}px !important; max-width: none !important; height: auto;
			max-height: ${fullPageHeightPx(paper)}px !important;
		}
		.review-flowchart svg {
			width: ${Math.round(fullPageWidthPx(paper) * 0.93)}px !important;
			max-height: ${fullPageHeightPx(paper) - 150}px !important;
		}
		.review-state { break-inside: avoid-page; page-break-inside: avoid; }
		body { counter-reset: figure; }
		${figureSelector} {
			counter-increment: figure;
			break-inside: avoid;
			margin: 0.1in auto 0.3in;
		}
		${
			sectionNumber === null
				? ''
				: `${figureSelector
						.split(', ')
						.map((selector) => `${selector}::before`)
						.join(', ')} {
			content: '${sectionNumber}.' counter(figure);
			display: block;
			margin-bottom: 6px;
			font: 700 9pt/1.2 -apple-system, 'Segoe UI', Helvetica, sans-serif;
			color: #111;
			text-align: center;
		}`
		}
	`;
}

/** The width of a full page's content, in the page's own pixels. */
function fullPageWidthPx(paper: PageSize): number {
	return ((paper.widthIn - 2 * fullPageMarginIn) * cssPxPerInch) / zoom;
}

/** The tallest a figure can be on a full page, in the page's own pixels, less room for the header. */
function fullPageHeightPx(paper: PageSize): number {
	return ((paper.heightIn - 2 * fullPageMarginIn) * cssPxPerInch) / zoom - 40;
}

/**
 * What surrounds a figure on its page, in the figure's own pixels: the number above it and the space
 * around it. Underestimate this and a figure shrunk to "fit" is a few pixels too tall, and splits.
 */
const figureFurnitureCssPx = 130;

/**
 * The tallest a figure can be and still sit on a page whole, in the page's own pixels: the page
 * less its margins, at print zoom, less room for the figure's number and the space around it.
 */
function figureHeightLimitPx(page: PageSize): number {
	const roomIn = page.heightIn - 2 * verticalMarginIn;

	return (roomIn * cssPxPerInch) / zoom - figureFurnitureCssPx;
}

/**
 * Shrinks any figure too tall to sit on a page together with what introduces it. A heading and the
 * paragraph under it are kept on the page with their figure, so the three have to fit one page
 * between them; a figure that only just fits a page alone cannot, and the page splits it somewhere
 * instead — leaving a screenful of white where the top of it should be. Runs in the page.
 */
function fitFiguresToPage(args: { limitPx: number; selector: string }): void {
	for (const figure of document.querySelectorAll<HTMLElement>(args.selector)) {
		// The heading and paragraphs directly above the figure, which travel with it.
		let block: HTMLElement = figure;

		while (
			block.previousElementSibling === null &&
			block.parentElement !== null &&
			!block.parentElement.matches('.sbdocs-content')
		) {
			block = block.parentElement;
		}

		let introPx = 0;

		for (
			let above = block.previousElementSibling;
			above?.matches('h1, h2, h3, h4, p');
			above = above.previousElementSibling
		) {
			// Their margins are outside what a rectangle measures.
			introPx += above.getBoundingClientRect().height + 28;
		}

		const limit = args.limitPx - introPx;
		const height = figure.getBoundingClientRect().height;

		if (height > limit) {
			figure.style.zoom = String(limit / height);
		}
	}
}

/**
 * Prints the review document's docs pages from Storybook, so its prose is written where the
 * components are, and the stories on a page are the components themselves rather than pictures
 * described by a script.
 */
export class DocsPrinter {
	private constructor(
		private readonly browser: Browser,
		private readonly baseUrl: string,
		private readonly locale: Locale,
		private readonly paper: PageSize,
	) {}

	static async open(options: {
		baseUrl: string;
		locale: Locale;
		paper: PageSize;
	}): Promise<DocsPrinter> {
		return new DocsPrinter(await launchChromium(), options.baseUrl, options.locale, options.paper);
	}

	/**
	 * Prints one page. `number` is its section's number, or `null` for front matter. `contents` is
	 * what the run knows about the whole document, for the page that lists it. Throws if Storybook
	 * shows an error instead of the page, or the page embeds a still nobody photographed.
	 */
	async print(
		page: ReviewPage,
		options: { number: number | null; contents?: ReviewContents },
	): Promise<PrintedPage> {
		const { paper } = this;
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

			if (options.contents) {
				await context.addInitScript((contents) => {
					window.__REVIEW_CONTENTS__ = contents;
				}, options.contents);
			}

			const tab = await context.newPage();

			await tab.goto(docsUrl(this.baseUrl, page.id, { locale: this.locale, appFrame: 'on' }), {
				waitUntil: 'domcontentloaded',
			});
			await tab.waitForSelector('.sbdocs-content, .sb-errordisplay', { state: 'attached' });

			const failure = await tab.evaluate(() =>
				document.body.classList.contains('sb-show-errordisplay')
					? (document.querySelector('#error-message')?.textContent?.trim() ?? 'unknown error')
					: null,
			);

			if (failure !== null) {
				throw new Error(`Storybook could not render “${page.title}” (${page.id}): ${failure}`);
			}

			await this.untilRendered(tab, page);
			await tab.addStyleTag({ content: printCss(options.number, paper) });
			await tab.emulateMedia({ media: 'print' });
			await tab.evaluate(fitFiguresToPage, {
				limitPx: figureHeightLimitPx(paper),
				selector: figureSelector,
			});

			const pdf = await tab.pdf({
				width: `${paper.widthIn}in`,
				height: `${paper.heightIn}in`,
				margin: {
					top: `${verticalMarginIn}in`,
					bottom: `${verticalMarginIn}in`,
					left: `${sideMarginIn}in`,
					right: `${sideMarginIn}in`,
				},
				scale: zoom,
				// The `@page` rules decide each page's size, so a page can be turned on its side.
				preferCSSPageSize: true,
				printBackground: true,
				displayHeaderFooter: true,
				// The page number is stamped once the document is assembled, when it is known.
				headerTemplate:
					options.number === null
						? '<div></div>'
						: `<div style="width:100%;padding:0 ${sideMarginIn}in;font:8px -apple-system,Helvetica,sans-serif;color:#666">
							<b style="color:#111">${options.number}</b>&nbsp; ${escapeHtml(page.label)}
						</div>`,
				footerTemplate: '<div></div>',
			});

			return {
				page,
				pdf,
				pages: (await PDFDocument.load(pdf)).getPageCount(),
				figures: await tab.evaluate(
					(selector) => document.querySelectorAll(selector).length,
					figureSelector,
				),
			};
		} finally {
			await context.close();
		}
	}

	/**
	 * Waits until every figure on the page has drawn something and the page has stopped changing.
	 *
	 * A story that has not rendered prints as an empty box, or not at all, and a page that is short
	 * a few figures looks finished — so "nothing has happened for a moment" is not evidence, and
	 * "every figure has content" has to be. The quiet period after that is for what draws itself
	 * later, such as a diagram. A cold Storybook can also reload the page once while it finishes
	 * optimizing its dependencies, so a navigation in the middle of the wait starts it over.
	 *
	 * A still that was never photographed shows a notice in its place, which is what is looked for at
	 * the end: the document does not print with a hole where a picture should be.
	 */
	private async untilRendered(tab: Page, page: ReviewPage): Promise<void> {
		for (let attempt = 0; ; attempt += 1) {
			try {
				await tab.waitForFunction(
					(selector) => {
						const figures = [...document.querySelectorAll<HTMLElement>(selector)];

						return (
							document.querySelector('.sbdocs-content') !== null &&
							figures.every(
								(figure) =>
									figure.innerText.trim().length > 0 ||
									(figure.querySelector('img')?.complete ?? false),
							)
						);
					},
					figureSelector,
					{ timeout: renderTimeoutMs },
				);
				await tab.evaluate(() => document.fonts.ready);
				await tab.evaluate(
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

				const missing = await tab.evaluate(() =>
					[...document.querySelectorAll('.review-figure .missing code')]
						.filter((code, position) => position % 2 === 0)
						.map((code) => code.textContent ?? ''),
				);

				if (missing.length > 0) {
					throw new Error(
						`“${page.title}” embeds stills nobody photographed: ${missing.join(', ')}. ` +
							'Name them in scripts/stills/still-catalog.mts, or fix the id.',
					);
				}

				return;
			} catch (error) {
				const navigated = String(error).includes('Execution context was destroyed');

				if (!navigated || attempt >= 3) {
					throw error instanceof Error && error.message.includes('nobody photographed')
						? error
						: new Error(`“${page.title}” (${page.id}) did not finish rendering.`, {
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
