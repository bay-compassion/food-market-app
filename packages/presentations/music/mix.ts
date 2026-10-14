/**
 * Mixes a video's soundtrack from GarageBand's Apple Loops and its voiceover, following the video's
 * arrangement (see `videos.ts`), and writes it where the build looks for it to embed.
 *
 *   node packages/presentations/music/mix.ts                # the market day reel
 *   node packages/presentations/music/mix.ts queue-desk     # the queue desk video, with its narration
 *
 * An arrangement is a function of the video's length and its narration cues (when each line starts
 * and how long it runs, read from the built page), returning parts: a `loop` by name, or a `voice`
 * line by id, recorded by `voice.ts`. A part with `duck` drops by that many dB under every line.
 *
 * Needs GarageBand's loop library installed (`/Library/Audio/Apple Loops`), macOS's `afconvert`,
 * a built page (for the reel's length), and `npx playwright install chromium` once. The mixing
 * runs in Chromium's Web Audio engine, which is also what plays the loops back faster for tempo.
 *
 * Apple's licence lets the mixed track ship in the reel; the loops themselves must not be
 * redistributed, which is why they are decoded into the ignored `out/` folder and never committed.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

import type { Arrangement, Cue, SoundPart } from '../stage/reel.ts';
import { videoFromArgs } from '../videos.ts';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const library = '/Library/Audio/Apple Loops';
const out = path.join(root, 'out');
const decoded = path.join(out, 'loops');

/** Every `.caf` in the library, by name. */
function findLoops(dir: string, found = new Map<string, string>()): Map<string, string> {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			findLoops(full, found);
		} else if (entry.name.endsWith('.caf')) {
			found.set(entry.name.slice(0, -4), full);
		}
	}

	return found;
}

void (async () => {
	const video = videoFromArgs();
	const { default: arrangement } = (await import(path.join(root, video.arrangement))) as {
		default: Arrangement;
	};
	const browser = await chromium.launch();
	const tab = await browser.newPage();

	await tab.goto('file://' + path.join(out, video.name + '.html') + '#record');
	await tab.waitForFunction(() => window.reel);
	const { end, cues } = await tab.evaluate(() => ({
		end: window.reel.END,
		cues: window.reel.cues,
	}));
	const parts = arrangement(end, cues);
	const available = findLoops(library);
	const loops: Record<string, string> = {};

	mkdirSync(decoded, { recursive: true });

	for (const id of new Set(parts.flatMap((part) => (part.voice ? [part.voice] : [])))) {
		const wav = path.join(out, video.name, 'voice', id + '.wav');

		if (!existsSync(wav)) {
			throw new Error(
				`No recording of "${id}"; run: node packages/presentations/voice.ts ${video.name}`,
			);
		}

		loops['voice:' + id] = readFileSync(wav).toString('base64');
	}

	for (const name of new Set(parts.flatMap((part) => (part.loop ? [part.loop] : [])))) {
		const source = available.get(name);

		if (!source) {
			throw new Error(`"${name}" is not in ${library}; download it in GarageBand's Sound Library`);
		}

		const wav = path.join(decoded, name + '.wav');

		if (!existsSync(wav)) {
			execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@44100', source, wav]);
		}

		loops[name] = readFileSync(wav).toString('base64');
	}

	await tab.goto('about:blank');
	const wav = await tab.evaluate(
		async ({
			loops,
			end,
			parts,
			cues,
		}: {
			loops: Record<string, string>;
			end: number;
			parts: SoundPart[];
			cues: Cue[];
		}) => {
			const rate = 44100;
			const ctx = new OfflineAudioContext(2, Math.ceil(end * rate), rate);
			const buffers: Record<string, AudioBuffer> = {};

			for (const [name, base64] of Object.entries(loops)) {
				const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

				buffers[name] = await ctx.decodeAudioData(bytes.buffer);
			}

			const master = ctx.createGain();
			const glue = ctx.createDynamicsCompressor();

			glue.threshold.value = -14;
			glue.ratio.value = 2;
			glue.attack.value = 0.02;
			glue.release.value = 0.25;
			master.connect(glue).connect(ctx.destination);

			// A light shared room, so loops recorded dry and wet sit in one space.
			const room = ctx.createConvolver();
			const impulse = ctx.createBuffer(2, 2.2 * rate, rate);
			let seed = 3;
			const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

			for (let c = 0; c < 2; c++) {
				const data = impulse.getChannelData(c);

				for (let i = 0; i < data.length; i++) {
					data[i] = noise() * Math.pow(1 - i / data.length, 3);
				}
			}

			room.buffer = impulse;
			const roomLevel = ctx.createGain();

			roomLevel.gain.value = 0.18;
			room.connect(roomLevel).connect(master);

			for (const part of parts) {
				const buffer = buffers[part.loop ?? 'voice:' + part.voice]!;
				const speed = part.rate ?? 1;
				const length = buffer.duration / speed;
				const level = Math.pow(10, part.db / 20);
				const fadeIn = part.fadeIn ?? 0.01;
				const fadeOut = part.fadeOut ?? 0.05;
				const gain = ctx.createGain();

				gain.gain.setValueAtTime(0, part.start);
				gain.gain.linearRampToValueAtTime(level, part.start + fadeIn);
				gain.gain.setValueAtTime(level, Math.max(part.start + fadeIn, part.end - fadeOut));
				gain.gain.linearRampToValueAtTime(0, part.end);
				let node: AudioNode = gain;

				// Under each line of narration the part dips, and comes back up slowly after it, so the
				// short pauses between lines don't pump; it is only back to full in a longer break.
				if (part.duck) {
					const duck = ctx.createGain();
					const low = Math.pow(10, -part.duck / 20);

					for (const cue of cues) {
						duck.gain.setTargetAtTime(low, cue.t - 0.3, 0.12);
						duck.gain.setTargetAtTime(1, cue.t + cue.duration + 0.2, 1.1);
					}

					gain.connect(duck);
					node = duck;
				}

				if (part.lowpass) {
					const filter = ctx.createBiquadFilter();

					filter.frequency.setValueAtTime(part.lowpass[0], part.start);
					filter.frequency.exponentialRampToValueAtTime(part.lowpass[1], part.end);
					node.connect(filter);
					node = filter;
				}

				const pan = ctx.createStereoPanner();
				const send = ctx.createGain();

				pan.pan.value = part.pan ?? 0;
				send.gain.value = part.verb ?? 0.3;
				node.connect(pan).connect(master);
				pan.connect(send).connect(room);

				// A line of narration plays once; a loop repeats to fill its part.
				const repeat = part.voice ? Infinity : length;

				for (let t = part.start - (part.offset ?? 0); t < part.end; t += repeat) {
					const source = ctx.createBufferSource();
					const from = Math.max(t, part.start);

					source.buffer = buffer;
					source.playbackRate.value = speed;
					source.connect(gain);
					source.start(from, (from - t) * speed);
					source.stop(Math.min(part.end, t + length) + 0.01);
				}
			}

			const mix = await ctx.startRendering();
			const left = mix.getChannelData(0);
			const right = mix.getChannelData(1);
			let peak = 0;

			for (let i = 0; i < left.length; i++) {
				peak = Math.max(peak, Math.abs(left[i]!), Math.abs(right[i]!));
			}

			// Normalised to just under full scale, then written as 16-bit PCM.
			const scale = (0.89 / peak) * 32767;
			const frames = left.length;
			const file = new DataView(new ArrayBuffer(44 + frames * 4));
			// The chunk tags are ASCII, one byte per character.
			const text = (offset: number, value: string) => {
				for (let i = 0; i < value.length; i++) {
					file.setUint8(offset + i, value.charCodeAt(i));
				}
			};

			text(0, 'RIFF');
			file.setUint32(4, 36 + frames * 4, true);
			text(8, 'WAVEfmt ');
			file.setUint32(16, 16, true);
			file.setUint16(20, 1, true);
			file.setUint16(22, 2, true);
			file.setUint32(24, rate, true);
			file.setUint32(28, rate * 4, true);
			file.setUint16(32, 4, true);
			file.setUint16(34, 16, true);
			text(36, 'data');
			file.setUint32(40, frames * 4, true);

			for (let i = 0; i < frames; i++) {
				file.setInt16(44 + i * 4, left[i]! * scale, true);
				file.setInt16(46 + i * 4, right[i]! * scale, true);
			}

			const bytes = new Uint8Array(file.buffer);
			let binary = '';

			for (let i = 0; i < bytes.length; i += 32768) {
				binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
			}

			return btoa(binary);
		},
		{ loops, end, parts, cues },
	);

	await browser.close();
	const wavPath = path.join(out, video.name, 'soundtrack.wav');

	mkdirSync(path.dirname(wavPath), { recursive: true });
	writeFileSync(wavPath, Buffer.from(wav, 'base64'));
	execFileSync('afconvert', [
		'-f',
		'm4af',
		'-d',
		'aac',
		'-b',
		'192000',
		wavPath,
		path.join(root, video.soundtrack),
	]);
	console.log(`Wrote ${video.soundtrack}; rebuild the page to embed it.`);
})();
