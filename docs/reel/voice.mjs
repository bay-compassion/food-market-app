/**
 * Records a video's narration, one clip per line, and writes how long each runs to the video's
 * `timings` file, which the build reads to pace the page. Commit the timings; the clips themselves
 * land in `out/<name>/voice/`, decoded for `music/mix.cjs` to lay under the picture.
 *
 *   node docs/reel/voice.mjs queue-desk
 *
 * Where the voice comes from is the narration file's `voice` setting:
 *
 * - `{ source: 'kokoro', name, speed }` — a local neural voice, generated in one batch with
 *   `kokoro.py`. Needs uv and ffmpeg; Python, packages and model files download on the first run.
 * - `{ source: 'recorded', folder }` — a person read the lines. Each is a file in that folder named
 *   for its id (`call-next.m4a`, or `.wav`, `.aiff`, `.mp3`); `voice.mjs` reports any missing.
 * - `{ source: 'say', name }` — macOS's own text to speech, for drafting the pace before anyone
 *   records. Apple's licence allows its system voices only for personal, non-commercial use, so a
 *   video voiced this way is a draft to review, never one to hand out (see README).
 *
 * Needs macOS (`say`, `afconvert`, `afinfo`).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { videoFromArgs } from './videos.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const video = videoFromArgs();

if (!video.narration) {
	throw new Error(`${video.name} has no narration.`);
}

const { lines, voice } = await import(path.join(dir, video.narration));
const clips = path.join(dir, 'out', video.name, 'voice');
const timingsPath = path.join(dir, video.timings);
const previous = existsSync(timingsPath)
	? JSON.parse(readFileSync(timingsPath, 'utf8'))
	: { lines: {} };

mkdirSync(clips, { recursive: true });

if (voice.source === 'kokoro') {
	const cache = path.join(dir, 'out', 'kokoro');

	try {
		execFileSync(
			'uv',
			['run', '--managed-python', '--python', '3.12', '--script', path.join(dir, 'kokoro.py')],
			{
				input: JSON.stringify({ voice, lines, clips, cache }),
				stdio: ['pipe', 'inherit', 'inherit'],
				env: {
					...process.env,
					UV_CACHE_DIR: process.env.UV_CACHE_DIR ?? path.join(cache, 'uv-cache'),
					UV_PYTHON_INSTALL_DIR: process.env.UV_PYTHON_INSTALL_DIR ?? path.join(cache, 'python'),
				},
			},
		);
	} catch (error) {
		throw new Error(
			'Neural narration failed. Install uv and allow downloads on the first run; see docs/reel/README.md.',
			{ cause: error },
		);
	}
}

/** Seconds of audio in a file, as `afinfo` measures it. */
function duration(file) {
	const info = execFileSync('afinfo', [file], { encoding: 'utf8' });
	const seconds = Number(info.match(/estimated duration: ([\d.]+)/)?.[1]);

	if (!seconds) {
		throw new Error(`Could not read the length of ${file}`);
	}

	return seconds;
}

/** Decodes any clip to the 44.1 kHz 16-bit WAV the mixer reads. */
function toWav(source, wav) {
	execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@44100', source, wav]);
}

function recordWithSay(line, wav) {
	const aiff = wav.replace(/\.wav$/, '.aiff');

	try {
		execFileSync(
			'say',
			['-v', voice.name, ...(voice.rate ? ['-r', String(voice.rate)] : [])].concat([
				'-o',
				aiff,
				line.say ?? line.text,
			]),
			{
				stdio: 'pipe',
			},
		);
	} catch {
		throw new Error(
			`macOS has no voice named "${voice.name}". List them with: say -v '?'\n` +
				'Better ones download free in System Settings › Accessibility › Spoken Content › System Voice › Manage Voices.',
		);
	}

	toWav(aiff, wav);
}

function findRecording(line) {
	for (const extension of ['m4a', 'wav', 'aiff', 'mp3']) {
		const file = path.join(dir, voice.folder, `${line.id}.${extension}`);

		if (existsSync(file)) {
			return file;
		}
	}

	return null;
}

const missing = [];
const timings = { voice: { ...voice }, lines: {} };

for (const line of lines) {
	const wav = path.join(clips, `${line.id}.wav`);

	if (voice.source === 'say') {
		recordWithSay(line, wav);
	} else if (voice.source === 'kokoro') {
		// Match spoken loudness across clips, leaving headroom for the music underneath.
		execFileSync('ffmpeg', [
			'-hide_banner',
			'-loglevel',
			'error',
			'-y',
			'-i',
			path.join(clips, `${line.id}.kokoro.wav`),
			'-af',
			'loudnorm=I=-16:TP=-2:LRA=7',
			'-ar',
			'44100',
			'-c:a',
			'pcm_s16le',
			wav,
		]);
	} else if (voice.source === 'recorded') {
		const recording = findRecording(line);

		if (!recording) {
			missing.push(line.id);
			continue;
		}

		toWav(recording, wav);
	} else {
		throw new Error(`Unknown voice source "${voice.source}"; use "kokoro", "recorded" or "say".`);
	}

	timings.lines[line.id] = { text: line.text, duration: Number(duration(wav).toFixed(3)) };
}

if (missing.length) {
	console.error(`No recording yet for: ${missing.join(', ')} (in ${voice.folder}/).`);
	process.exitCode = 1;
} else {
	writeFileSync(timingsPath, JSON.stringify(timings, null, 2) + '\n');
	const total = Object.values(timings.lines).reduce((sum, line) => sum + line.duration, 0);
	const changed = lines.filter(
		(line) => previous.lines[line.id]?.duration !== timings.lines[line.id].duration,
	).length;

	console.log(
		`${lines.length} lines, ${total.toFixed(1)} s of speech (${changed} changed length). ` +
			`Wrote ${video.timings}; rebuild, then mix.`,
	);
}
