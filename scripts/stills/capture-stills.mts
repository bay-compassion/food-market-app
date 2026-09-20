#!/usr/bin/env node

/**
 * Builds the review document: the MDX docs pages from Storybook, then photographs of the running
 * app for what a docs page cannot show, all as one PDF of numbered pages.
 *
 * The document is meant to leave the screen: printed, marked up by people who never open a code
 * editor, and handed back. Its explanation is written where the components are — in MDX, tagged
 * `review` — and its stories sit inside the app's own bar and footer. The stills are for what only
 * a guest doing something reaches: a dialog, a failure, a text message. Each is a whole screen of
 * the real app, put in a state by what the phone has saved and what the server would say, with no
 * backend behind it. Paper is the fixed constraint: `scripts/stills/print-layout.mts` divides a
 * sheet into a grid and scales each still into a cell, so a sheet is always one sheet.
 *
 * Usage:
 *   npm run capture:stills
 *   npm run capture:stills -- --arc text-updates          (stills only, no Storybook)
 *   npm run capture:stills -- --storybook-url http://localhost:6006 --locale es
 *
 * See docs/stills.md.
 */

import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { languages, type Locale } from '../../src/locales.js';
import { AppServer } from './app-server.mjs';
import { assembleDocument } from './assemble-document.mjs';
import { ContactSheet, type SheetSection } from './contact-sheet.mjs';
import { DocsPrinter, type PrintedDoc } from './docs-printer.mjs';
import {
	defaultPrintLayoutOptions,
	paperSizes,
	PrintLayout,
	type PaperSize,
} from './print-layout.mjs';
import { renderPdf } from './print-pdf.mjs';
import { StillCatalog } from './still-catalog.mjs';
import { StillPhotographer, type Still } from './still-photographer.mjs';
import { fetchReviewDocs, reviewTag, StorybookServer } from './storybook-server.mjs';

const { values } = parseArgs({
	options: {
		out: { type: 'string', default: 'stills' },
		paper: { type: 'string', default: defaultPrintLayoutOptions.paper },
		orientation: { type: 'string', default: defaultPrintLayoutOptions.orientation },
		columns: { type: 'string', default: String(defaultPrintLayoutOptions.columns) },
		rows: { type: 'string', default: String(defaultPrintLayoutOptions.rows) },
		margin: { type: 'string', default: String(defaultPrintLayoutOptions.marginIn) },
		gap: { type: 'string', default: String(defaultPrintLayoutOptions.gapIn) },
		arc: { type: 'string', multiple: true, default: [] },
		locale: { type: 'string', default: 'en' },
		'app-url': { type: 'string' },
		port: { type: 'string', default: '5180' },
		'storybook-url': { type: 'string' },
		'storybook-port': { type: 'string', default: '6100' },
		docs: { type: 'boolean', default: true },
		settle: { type: 'string', default: '350' },
		scale: { type: 'string', default: '2' },
		pdf: { type: 'boolean', default: true },
		help: { type: 'boolean', default: false },
	},
});

if (values.help) {
	console.log(
		[
			'Build the review document: Storybook docs pages, then photographs of the running app.',
			'',
			'  --out <dir>            Output directory (default: stills)',
			`  --paper <name>         ${Object.keys(paperSizes).join(' | ')} (default: letter)`,
			'  --orientation <name>   portrait | landscape (default: portrait)',
			'  --columns <n>          Stills across a sheet (default: 2)',
			'  --rows <n>             Stills down a sheet (default: 1)',
			'  --margin <in>          Trim margin in inches (default: 0.4)',
			'  --gap <in>             Gutter between stills in inches (default: 0.22)',
			'  --arc <id>             Photograph only these arcs, and print no docs pages; repeatable',
			`  --no-docs              Leave out the docs pages tagged "${reviewTag}"`,
			'  --storybook-url <url>  Use a Storybook already running instead of starting one',
			'  --storybook-port <n>   Port to start Storybook on (default: 6100)',
			`  --locale <code>        Language of every screen (${languages.map((l) => l.code).join(', ')}; default: en)`,
			'  --app-url <url>        Use an app already running (npm run dev) instead of starting one',
			'  --port <n>             Port to start the app on (default: 5180)',
			'  --settle <ms>          Pause after each screen renders, before it is shot (default: 350)',
			'  --scale <n>            Device pixel ratio of the captures (default: 2)',
			'  --no-pdf               Write the HTML sheets but skip the PDF',
			'',
			`Arcs: ${new StillCatalog().arcIds.join(', ')}`,
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

const layout = new PrintLayout({
	...defaultPrintLayoutOptions,
	paper: paper(values.paper),
	orientation: values.orientation === 'landscape' ? 'landscape' : 'portrait',
	columns: Math.round(number('columns', values.columns)),
	rows: Math.round(number('rows', values.rows)),
	marginIn: number('margin', values.margin),
	gapIn: number('gap', values.gap),
});

layout.assertUsable();

const language = locale(values.locale);
const outputDirectory = path.resolve(values.out);
const catalog = new StillCatalog();
const sections = catalog.sections(values.arc);

if (sections.length === 0) {
	throw new Error(`No arc matched --arc. Known arcs: ${catalog.arcIds.join(', ')}.`);
}

/**
 * Prints every docs page tagged for review. Storybook is started for this and shut down as soon as
 * it is done, ahead of the stills, so the two servers are never up together. Naming `--arc` is
 * asking for stills alone, which is also what makes iterating on one arc quick.
 */
async function printReviewDocs(): Promise<PrintedDoc[]> {
	if (!values.docs || values.arc.length > 0) {
		return [];
	}

	await using storybook = values['storybook-url']
		? StorybookServer.existing(values['storybook-url'])
		: await StorybookServer.start(Math.round(number('storybook-port', values['storybook-port'])));
	const docs = await fetchReviewDocs(storybook.baseUrl);

	if (docs.length === 0) {
		console.log(`No docs page is tagged “${reviewTag}”, so the document has no docs pages.`);

		return [];
	}

	await using printer = await DocsPrinter.open({
		baseUrl: storybook.baseUrl,
		locale: language,
		layout,
	});
	const printed: PrintedDoc[] = [];

	for (const [index, doc] of docs.entries()) {
		process.stdout.write(`${doc.label} `);

		const result = await printer.print(doc, index + 1);

		process.stdout.write(
			`(${result.pages} page${result.pages === 1 ? '' : 's'}, ` +
				`${result.figures} figure${result.figures === 1 ? '' : 's'})\n`,
		);
		printed.push(result);
	}

	return printed;
}

const printedDocs = await printReviewDocs();

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

const captured: SheetSection[] = [];

// A beat that never reaches its screen throws out of `capture`, which ends the run: a printed arc
// with the wrong screen in the middle of it is worse than no arc.
for (const { arc, steps } of sections) {
	const stills: Still[] = [];

	process.stdout.write(`${arc.title} (${steps.length}) `);

	for (const step of steps) {
		const still = await photographer.capture(step);

		stills.push(still);
		process.stdout.write(still.truncated ? '~' : '.');
	}

	process.stdout.write('\n');
	captured.push({ arc, stills });
}

const sheet = new ContactSheet(layout, captured, {
	title: 'The Bay Compassion — review document',
	generatedAt: new Date(),
	revision: revision(),
	language: languages.find((entry) => entry.code === language)?.label ?? language,
	docs: printedDocs.map(({ doc, pages }) => ({ title: doc.label, pages })),
});
const htmlPath = path.join(outputDirectory, 'review.html');

await writeFile(htmlPath, sheet.toHtml(), 'utf8');

if (values.pdf) {
	await writeFile(
		path.join(outputDirectory, 'review.pdf'),
		await assembleDocument(await renderPdf(htmlPath, layout), printedDocs),
	);
}

const cutOff = captured.flatMap((section) => section.stills.filter((still) => still.truncated));
const docPages = printedDocs.reduce((total, { pages }) => total + pages, 0);

console.log(
	`\n${printedDocs.length} docs page${printedDocs.length === 1 ? '' : 's'} (${docPages} pages), ` +
		`${sheet.stillCount} stills on ${sheet.sheetCount} ` +
		`${layout.pageWidthIn}×${layout.pageHeightIn}in sheets, plus a contents page → ${outputDirectory}`,
);

for (const still of cutOff) {
	console.log(`  cut off  ${still.step.caption} (${still.step.id})`);
}
