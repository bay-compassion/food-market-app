#!/usr/bin/env node

/**
 * Builds the review document: the MDX docs pages from Storybook, as one PDF of numbered pages.
 *
 * The document is meant to leave the screen: printed, marked up by people who never open a code
 * editor, and handed back. Every word in it is written in MDX, in a page tagged `review`, and every
 * story on those pages sits inside the app's own bar and footer. The one thing this script makes
 * itself is photographs of the running app, for screens a story cannot show — a dialog, a failure,
 * a form just submitted — which a page embeds with `<Still id="…" />`. They are taken first, so
 * that Storybook can serve them when it prints the pages that use them.
 *
 * Usage:
 *   npm run capture:stills
 *   npm run capture:stills -- --still cancel-asked        (photograph one still; no document)
 *   npm run capture:stills -- --storybook-url http://localhost:6006 --locale es
 *
 * See docs/stills.md.
 */

import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

import type { ReviewContents, ReviewPage } from '../../.storybook/docs/review-index.js';
import { languages, type Locale } from '../../src/locales.js';
import { AppServer } from './app-server.mjs';
import { assembleDocument } from './assemble-document.mjs';
import { DocsPrinter, type PrintedPage } from './docs-printer.mjs';
import { pageSize, paperSizes, type PaperSize } from './paper.mjs';
import { StillCatalog } from './still-catalog.mjs';
import { StillPhotographer, type Still } from './still-photographer.mjs';
import { fetchReviewPages, StorybookServer } from './storybook-server.mjs';

const { values } = parseArgs({
	options: {
		out: { type: 'string', default: 'stills' },
		paper: { type: 'string', default: 'letter' },
		orientation: { type: 'string', default: 'portrait' },
		still: { type: 'string', multiple: true, default: [] },
		locale: { type: 'string', default: 'en' },
		'app-url': { type: 'string' },
		port: { type: 'string', default: '5180' },
		'storybook-url': { type: 'string' },
		'storybook-port': { type: 'string', default: '6100' },
		settle: { type: 'string', default: '350' },
		scale: { type: 'string', default: '2' },
		docs: { type: 'boolean', default: true },
		help: { type: 'boolean', default: false },
	},
});

if (values.help) {
	console.log(
		[
			'Build the review document: Storybook docs pages, with photographs of the running app.',
			'',
			'  --out <dir>            Output directory (default: stills)',
			`  --paper <name>         ${Object.keys(paperSizes).join(' | ')} (default: letter)`,
			'  --orientation <name>   portrait | landscape (default: portrait)',
			'  --still <id>           Photograph only these stills, and build no document; repeatable',
			'  --no-docs              Photograph the stills, and build no document',
			`  --locale <code>        Language of every screen and story (${languages.map((l) => l.code).join(', ')}; default: en)`,
			'  --app-url <url>        Use an app already running (npm run dev) instead of starting one',
			'  --port <n>             Port to start the app on (default: 5180)',
			'  --storybook-url <url>  Use a Storybook already running instead of starting one',
			'  --storybook-port <n>   Port to start Storybook on (default: 6100)',
			'  --settle <ms>          Pause after each still renders, before it is shot (default: 350)',
			'  --scale <n>            Device pixel ratio of the stills (default: 2)',
			'',
			`Stills: ${new StillCatalog().ids.join(', ')}`,
		].join('\n'),
	);
	process.exit(0);
}

function number(name: string, raw: string): number {
	const parsed = Number(raw);

	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new Error(`--${name} must be a positive number, got "${raw}".`);
	}

	return parsed;
}

function paper(raw: string): PaperSize {
	if (raw in paperSizes) {
		return raw as PaperSize;
	}

	throw new Error(`--paper must be one of ${Object.keys(paperSizes).join(', ')}, got "${raw}".`);
}

function locale(raw: string): Locale {
	const match = languages.find((language) => language.code === raw);

	if (!match) {
		throw new Error(`--locale must be one of ${languages.map((l) => l.code).join(', ')}.`);
	}

	return match.code;
}

function revision(): string {
	const head = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' });
	const dirty = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });

	if (head.status !== 0) {
		return 'unknown';
	}

	return `${head.stdout.trim()}${dirty.stdout.trim() ? ' (with uncommitted changes)' : ''}`;
}

const language = locale(values.locale);
const outputDirectory = path.resolve(values.out);
const stillsDirectory = path.join(outputDirectory, 'png');
const page = pageSize(
	paper(values.paper),
	values.orientation === 'landscape' ? 'landscape' : 'portrait',
);
const steps = new StillCatalog().select(values.still);
const buildsDocument = values.docs && values.still.length === 0;

/** Photographs the stills, before anything that embeds them is printed. */
async function photographStills(): Promise<Still[]> {
	await using app = values['app-url']
		? AppServer.existing(values['app-url'])
		: await AppServer.start(Math.round(number('port', values.port)));
	await using photographer = await StillPhotographer.open({
		baseUrl: app.baseUrl,
		outputDirectory,
		locale: language,
		settleMs: number('settle', values.settle),
		deviceScaleFactor: number('scale', values.scale),
	});
	const stills: Still[] = [];

	process.stdout.write(`Stills (${steps.length}) `);

	// A still that never reaches its screen throws out of `capture`, which ends the run: a figure of
	// the wrong screen in the middle of the document is worse than no figure.
	for (const step of steps) {
		const still = await photographer.capture(step);

		stills.push(still);
		process.stdout.write(still.truncated ? '~' : '.');
	}

	process.stdout.write('\n');

	return stills;
}

/** What the contents page needs and only a run can know: where each section starts, and when. */
function contentsFor(sections: readonly PrintedPage[], frontPages: number): ReviewContents {
	let startPage = frontPages + 1;

	return {
		sections: sections.map(({ page: { label }, pages }, position) => {
			const row = { number: position + 1, label, startPage, pages };

			startPage += pages;

			return row;
		}),
		capturedAt: `${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`,
		revision: revision(),
		language: languages.find((entry) => entry.code === language)?.label ?? language,
	};
}

/**
 * Prints the front matter last, because the contents page lists where the sections start and that
 * depends on how long the front matter is. It is printed on a guess of its own length and again, if
 * the guess was wrong, on the length it turned out to be; a length that will not settle is an error
 * rather than a contents page that points at the wrong pages.
 */
async function printFront(
	printer: DocsPrinter,
	front: readonly ReviewPage[],
	sections: readonly PrintedPage[],
): Promise<PrintedPage[]> {
	let frontPages = front.length;

	for (let attempt = 0; attempt < 3; attempt += 1) {
		const contents = contentsFor(sections, frontPages);
		const printed: PrintedPage[] = [];

		for (const entry of front) {
			printed.push(await printer.print(entry, { number: null, contents }));
		}

		const actual = printed.reduce((total, { pages }) => total + pages, 0);

		if (actual === frontPages) {
			return printed;
		}

		frontPages = actual;
	}

	throw new Error('The contents page kept changing length as its page numbers changed.');
}

/**
 * Prints every docs page tagged for the document. Storybook is started for this and shut down as
 * soon as it is done.
 */
async function printDocument(): Promise<PrintedPage[]> {
	await using storybook = values['storybook-url']
		? StorybookServer.existing(values['storybook-url'])
		: await StorybookServer.start(Math.round(number('storybook-port', values['storybook-port'])), {
				// So the folder the stills were just written to is the one Storybook serves at `/stills`.
				env: { REVIEW_STILLS_DIR: stillsDirectory },
			});
	const pages = await fetchReviewPages(storybook.baseUrl);
	const front = pages.filter(({ kind }) => kind === 'front');
	const sections = pages.filter(({ kind }) => kind === 'section');

	if (sections.length === 0) {
		throw new Error(
			"No docs page is tagged for review. Put tags={['review']} on a page’s <Meta>, " +
				"and tags={['review-front']} on the title page.",
		);
	}

	await using printer = await DocsPrinter.open({
		baseUrl: storybook.baseUrl,
		locale: language,
		paper: page,
	});
	const printedSections: PrintedPage[] = [];

	for (const [position, entry] of sections.entries()) {
		process.stdout.write(`${position + 1}  ${entry.label} `);

		const printed = await printer.print(entry, { number: position + 1 });

		process.stdout.write(
			`(${printed.pages} page${printed.pages === 1 ? '' : 's'}, ` +
				`${printed.figures} figure${printed.figures === 1 ? '' : 's'})\n`,
		);
		printedSections.push(printed);
	}

	return [...(await printFront(printer, front, printedSections)), ...printedSections];
}

await mkdir(stillsDirectory, { recursive: true });

const stills = await photographStills();
const cutOff = stills.filter((still) => still.truncated);

for (const still of cutOff) {
	console.log(`  cut off  ${still.step.id}`);
}

if (!buildsDocument) {
	console.log(`\n${stills.length} stills → ${stillsDirectory}`);
} else {
	const printed = await printDocument();
	const document = await assembleDocument(printed);

	await writeFile(path.join(outputDirectory, 'review.pdf'), document);

	const pages = printed.reduce((total, { pages: count }) => total + count, 0);

	console.log(
		`\n${printed.length} docs pages, ${pages} pages, ${stills.length} stills → ${outputDirectory}`,
	);
}
