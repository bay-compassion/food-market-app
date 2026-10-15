/**
 * Builds a video's page from its folder: its markup (`page.html`), its beat script (`page.ts`), the
 * shared stage (`stage/stage.css`, `stage/stage.ts`), the guest copy straight from
 * `src/locales.ts`, the queue desk's copy from `src/adminLocales.ts`, the logo and wordmark from
 * `public/`, the voiceover's timings, and the soundtrack, all inlined so the page is a single file.
 *
 * The scripts' types are stripped with `ts-blank-space`, which blanks them out rather than
 * reprinting the code, and each script is named with a `sourceURL`. A browser then reports every
 * line in a script against that script alone, so the line a beat came from — which `#dev` lists —
 * is its line in `page.ts`.
 *
 *   node build.ts                 # the market day reel
 *   node build.ts queue-desk      # the queue desk training video
 *
 * A video with a `frame` also gets part of the app itself — the guest phone (`phone/`) or the admin
 * dashboard (`admin/`): Vite builds that folder and the page carries the result, scripts and styles
 * inlined, as the document its frame shows.
 *
 * Writes `out/<name>.html` (open it in a browser) and `out/<name>.artifact.html` (the same page
 * without its document shell, for publishing as a claude.ai Artifact).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import blankSpace from 'ts-blank-space';
import { build as vite } from 'vite';

import { adminTranslations } from '../../src/adminLocales.ts';
import { translations } from '../../src/locales.ts';
import { brandCss, brandLockup } from './branding.ts';
import { brandFontCss } from './fonts.ts';
import type { NarrationLine, NarrationTimings, TimedLine, Voice } from './stage/reel.ts';
import { deskStrings, guestStrings } from './strings.ts';
import { videoFromArgs } from './videos.ts';

const here = (path: string) => new URL(path, import.meta.url);
const video = videoFromArgs();
const strict = process.argv.includes('--strict');

if (strict && !existsSync(here('./' + video.soundtrack))) {
	throw new Error(
		`Missing ${video.soundtrack}; render and commit the soundtrack before publishing.`,
	);
}

/**
 * The voiceover's lines with the length of each recording. A line reworded since it was recorded
 * keeps the page building, on an estimate, until `voice.ts` records it again.
 */
async function narration(): Promise<TimedLine[]> {
	if (!video.narration || !video.timings) {
		return [];
	}

	const { lines, voice } = (await import(here('./' + video.narration).href)) as {
		lines: NarrationLine[];
		voice: Voice;
	};
	const timings: NarrationTimings = existsSync(here('./' + video.timings))
		? JSON.parse(readFileSync(here('./' + video.timings), 'utf8'))
		: { lines: {} };
	const recordedVoice: Partial<Record<string, unknown>> = timings.voice ?? {};

	if (strict && !Object.entries(voice).every(([key, value]) => recordedVoice[key] === value)) {
		throw new Error(
			`The recorded voice differs from ${video.narration}; render and commit the audio first.`,
		);
	}

	const copy: Record<string, unknown> = adminTranslations.en;
	const renamed = lines.flatMap(({ id, text, names = [] }) =>
		names
			.filter((key) => {
				const label = copy[key];

				return typeof label !== 'string' || !text.toLowerCase().includes(label.toLowerCase());
			})
			.map((key) => `${id} says "${key}", now ${JSON.stringify(copy[key]) ?? 'gone'}`),
	);

	if (renamed.length) {
		const message = `The narration names labels the dashboard has changed: ${renamed.join('; ')}.`;

		if (strict) {
			throw new Error(`${message} Reword ${video.narration}, then record it again.`);
		}

		console.warn(message);
	}

	const stale: string[] = [];
	const result = lines.map((line) => {
		const recorded = timings.lines[line.id];

		if (
			recorded?.text === line.text &&
			Number.isFinite(recorded.duration) &&
			recorded.duration > 0
		) {
			return { ...line, duration: recorded.duration };
		}

		stale.push(line.id);

		return { ...line, duration: line.text.split(/\s+/).length / 2.6 };
	});

	if (stale.length) {
		if (strict) {
			throw new Error(
				`Narration needs recording for: ${stale.join(', ')}. Render and commit the audio first.`,
			);
		}

		console.warn(`Not yet recorded, so timed on an estimate: ${stale.join(', ')}.`);
		console.warn(`Run: node packages/presentations/voice.ts ${video.name}`);
	}

	return result;
}

/**
 * A TypeScript file as a classic script: its types blanked out in place, wrapped in a function so
 * its names stay its own, and named so a browser numbers its lines from its own first line. The
 * wrapper opens on that first line, so no line moves.
 */
function script(path: string, fill: (code: string) => string = (code) => code): string {
	const source = readFileSync(here(path), 'utf8');
	const code = blankSpace(source, (node) => {
		throw new Error(`${path} uses TypeScript that cannot be stripped: ${node.getText()}`);
	});

	// `</script` inside the code would end the inline script early.
	return (
		'(() => {' +
		fill(code).replaceAll('</script', '<\\/script') +
		'\n})();\n//# sourceURL=' +
		path.replace(/^\.\//, '')
	);
}

/** The frame's page, built by Vite, with its script and stylesheet inlined. */
async function frame(): Promise<string> {
	if (!video.frame) {
		return '';
	}

	await vite({ configFile: fileURLToPath(here(`./${video.frame}/vite.config.ts`)) });
	const out = (path: string) => readFileSync(here(`./out/${video.frame}/${path}`), 'utf8');

	const page = out('index.html')
		.replace(
			/<script type="module" crossorigin src="\.\/([^"]+)"><\/script>/,
			(_tag, path: string) =>
				`<script type="module">${out(path).replaceAll('</script', '<\\/script')}</script>`,
		)
		.replace(
			/<link rel="stylesheet" crossorigin href="\.\/([^"]+)">/,
			(_tag, path: string) => `<style>${out(path)}</style>`,
		);

	if (page.includes('./assets/')) {
		throw new Error(`The ${video.frame} frame still links an asset; inline it in build.ts.`);
	}

	return page;
}

const strings = Object.fromEntries(
	Object.entries(translations).map(([locale, t]) => [locale, guestStrings(t)]),
);
const svg = (path: string) =>
	'data:image/svg+xml;base64,' + readFileSync(here(path)).toString('base64');
const soundtrack = existsSync(here('./' + video.soundtrack))
	? readFileSync(here('./' + video.soundtrack)).toString('base64')
	: '';
const narrationJson = JSON.stringify(await narration());
const frameJson = JSON.stringify(await frame());
const stageScript = script('./stage/stage.ts', (code) =>
	code
		.replace('__STRINGS__', () => JSON.stringify(strings))
		.replace('__DESK__', () => JSON.stringify(deskStrings(adminTranslations.en, translations.en)))
		.replace('__LOGO__', () => svg('../../public/bay-compassion-icon-digital.svg'))
		.replace('__SOUNDTRACK__', () => soundtrack),
);
const pageScript = script(`./${video.folder}/page.ts`, (code) =>
	code
		.replace('__NARRATION__', () => narrationJson)
		.replace('__FRAME__', () => frameJson)
		.replace('__ADMIN_COPY__', () => JSON.stringify(adminTranslations.en)),
);
// Collapsed onto one line, so the stylesheet takes the single line its placeholder held.
const stageStyles = (
	brandFontCss +
	brandCss +
	readFileSync(here('./stage/stage.css'), 'utf8')
).replace(/\s*\n\s*/g, ' ');

const page =
	readFileSync(here(`./${video.folder}/page.html`), 'utf8')
		.replace('__STAGE_CSS__', () => stageStyles)
		.replaceAll('__BRAND_LOCKUP__', () =>
			brandLockup(svg('../../public/bay-compassion-icon-digital.svg')),
		) +
	'\n<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js"></script>' +
	// The page's script first: it waits for the stage, which comes after it.
	// Each script starts on its tag's own line: a newline first would make line 1 blank.
	`\n<script>${pageScript}</script>\n<script>${stageScript}</script>\n`;

mkdirSync(here('./out'), { recursive: true });
writeFileSync(here(`./out/${video.name}.artifact.html`), page);
writeFileSync(
	here(`./out/${video.name}.html`),
	'<!doctype html><html lang="en"><head><meta charset="utf-8">' +
		'<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' +
		'</head><body>' +
		page +
		'</body></html>',
);
console.log(`Built out/${video.name}.html (${Math.round(page.length / 1024)} KB)`);
