#!/usr/bin/env node

/**
 * Photographs every state in Storybook and lays the results out as printable contact sheets.
 *
 * The stills are meant to leave the screen: printed, spread on a table, and drawn on. Paper is
 * therefore the fixed constraint — `scripts/stills/print-layout.mts` divides a sheet into a grid
 * and scales each still into a cell, so a sheet is always one sheet. Storybook is the source
 * because it already enumerates the states the running app cannot easily be driven into, and its
 * story titles already carry the grouping.
 *
 * Usage:
 *   npm run capture:stills
 *   npm run capture:stills -- --group registering --group visit --columns 2 --rows 1
 *   npm run capture:stills -- --storybook-url http://localhost:6006 --locale es
 *
 * See docs/stills.md.
 */

import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { languages, type Locale } from '../../src/locales.js';
import { ContactSheet, type SheetSection } from './contact-sheet.mjs';
import {
	defaultPrintLayoutOptions,
	paperSizes,
	PrintLayout,
	type PaperSize,
} from './print-layout.mjs';
import { renderPdf } from './print-pdf.mjs';
import { StillCatalog } from './still-catalog.mjs';
import { StillPhotographer, type Still } from './still-photographer.mjs';
import { fetchStories, StorybookServer } from './storybook-index.mjs';

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
		locale: { type: 'string' },
		'storybook-url': { type: 'string' },
		port: { type: 'string', default: '6100' },
		settle: { type: 'string', default: '350' },
		scale: { type: 'string', default: '2' },
		pdf: { type: 'boolean', default: true },
		help: { type: 'boolean', default: false },
	},
});

if (values.help) {
	console.log(
		[
			'Capture Storybook states as printable contact sheets.',
			'',
			'  --out <dir>            Output directory (default: stills)',
			`  --paper <name>         ${Object.keys(paperSizes).join(' | ')} (default: letter)`,
			'  --orientation <name>   portrait | landscape (default: portrait)',
			'  --columns <n>          Stills across a sheet (default: 3)',
			'  --rows <n>             Stills down a sheet (default: 2)',
			'  --margin <in>          Trim margin in inches (default: 0.4)',
			'  --gap <in>             Gutter between stills in inches (default: 0.22)',
			'  --arc <id>             Capture only these arcs; repeatable',
			`  --locale <code>        Force one language (${languages.map((l) => l.code).join(', ')})`,
			'  --storybook-url <url>  Use a Storybook already running instead of starting one',
			'  --port <n>             Port to start Storybook on (default: 6100)',
			'  --settle <ms>          Pause after render, for play functions (default: 350)',
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

function locale(raw: string | undefined): Locale | undefined {
	if (raw === undefined) {
		return undefined;
	}

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

const forcedLocale = locale(values.locale);
const outputDirectory = path.resolve(values.out);
const catalog = new StillCatalog();

await using storybook = values['storybook-url']
	? StorybookServer.existing(values['storybook-url'])
	: await StorybookServer.start(Math.round(number('port', values.port)));

const stories = await fetchStories(storybook.baseUrl);
const sections = catalog.sections(values.arc);
const missing = catalog.missing(stories);

if (sections.length === 0) {
	throw new Error(`No arc matched --arc. Known arcs: ${catalog.arcIds.join(', ')}.`);
}

// A missing story would drop a beat out of the middle of a printed arc, so it stops the run rather
// than being noted at the end: the arcs name their stories outright, and a rename has to be followed.
if (missing.length > 0) {
	throw new Error(
		`Storybook has no story with these ids, named by scripts/stills/still-catalog.mts:\n  ` +
			`${missing.join('\n  ')}\nA story was renamed or removed; update the arc it belongs to.`,
	);
}

const byId = new Map(stories.map((story) => [story.id, story]));

await using photographer = await StillPhotographer.open({
	baseUrl: storybook.baseUrl,
	outputDirectory,
	// Only when asked: left alone, each story keeps the language it declares, which is what keeps
	// the right-to-left stories right-to-left instead of turning them into duplicates.
	globals: forcedLocale ? `locale:${forcedLocale}` : undefined,
	settleMs: number('settle', values.settle),
	deviceScaleFactor: number('scale', values.scale),
});

const captured: SheetSection[] = [];

for (const { arc, steps } of sections) {
	const stills: Still[] = [];

	process.stdout.write(`${arc.title} (${steps.length}) `);

	for (const step of steps) {
		const story = byId.get(step.id);

		// `missing` has already ruled this out; the lookup is here only to satisfy the type.
		if (!story) {
			continue;
		}

		const still = await photographer.capture({ step, story, frame: catalog.frameFor(arc, step) });

		stills.push(still);
		process.stdout.write(still.failed ? '!' : still.truncated ? '~' : '.');
	}

	process.stdout.write('\n');
	captured.push({ arc, stills });
}

const sheet = new ContactSheet(layout, captured, {
	title: 'The Bay Compassion — app stills',
	generatedAt: new Date(),
	revision: revision(),
	language: forcedLocale ? `forced to ${forcedLocale}` : 'as each story declares it',
});
const htmlPath = path.join(outputDirectory, 'stills.html');

await writeFile(htmlPath, sheet.toHtml(), 'utf8');

if (values.pdf) {
	await renderPdf(htmlPath, path.join(outputDirectory, 'stills.pdf'), layout);
}

const problems = captured.flatMap((section) =>
	section.stills.filter((still) => still.failed || still.truncated),
);

console.log(
	`\n${sheet.stillCount} stills across ${sheet.sheetCount} ` +
		`${layout.pageWidthIn}×${layout.pageHeightIn}in sheet${sheet.sheetCount === 1 ? '' : 's'}, ` +
		`plus a contents page → ${outputDirectory}`,
);

for (const still of problems) {
	console.log(
		`  ${still.failed ? 'failed ' : 'cut off'}  ${still.step.caption} (${still.story.id})`,
	);
}
