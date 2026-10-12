/**
 * Renders a video end to end: records its narration, builds the page, mixes the soundtrack,
 * rebuilds with it embedded, photographs every frame, and encodes the MP4.
 *
 *   node docs/reel/render.mjs queue-desk
 *   node docs/reel/render.mjs queue-desk --picture-only   # keep the committed timings and soundtrack
 *   node docs/reel/render.mjs market-day-reel --picture-only
 *
 * Writes `out/<name>.mp4`. The steps are the scripts the README describes, run in order; any of
 * them can still be run on its own. Needs macOS, `npx playwright install chromium` once, and — for
 * the audio steps — GarageBand's loop library.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { videoFromArgs } from './videos.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const video = videoFromArgs();
const pictureOnly = process.argv.includes('--picture-only');
const run = (command, ...args) => {
	console.log(`\n› ${command} ${args.join(' ')}`);
	execFileSync(command, args, { stdio: 'inherit', cwd: path.join(dir, '..', '..') });
};
const script = (name) => path.join('docs', 'reel', name);

if (!pictureOnly) {
	if (video.narration) {
		run('node', script('voice.mjs'), video.name);
	}

	run('node', script('build.mjs'), video.name);
	run('node', script('music/mix.cjs'), video.name);
}

run('node', script('build.mjs'), video.name);
run('node', script('capture.cjs'), video.name);

// The encoder is compiled once, and again whenever its source is newer.
const encoder = path.join(dir, 'out', 'encode');
const source = path.join(dir, 'encode.swift');

if (!existsSync(encoder) || statSync(encoder).mtimeMs < statSync(source).mtimeMs) {
	run('swiftc', '-O', source, '-o', encoder);
}

run(
	encoder,
	path.join(dir, 'out', video.name, 'frames'),
	path.join(dir, video.soundtrack),
	path.join(dir, 'out', `${video.name}.mp4`),
);
