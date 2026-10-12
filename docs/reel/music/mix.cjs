/**
 * Mixes the soundtrack from GarageBand's Apple Loops, following `arrangement.cjs`, and writes it
 * to `docs/reel/soundtrack.m4a` for the build to embed.
 *
 *   node docs/reel/music/mix.cjs
 *
 * Needs GarageBand's loop library installed (`/Library/Audio/Apple Loops`), macOS's `afconvert`,
 * a built page (for the reel's length), and `npx playwright install chromium` once. The mixing
 * runs in Chromium's Web Audio engine, which is also what plays the loops back faster for tempo.
 *
 * Apple's licence lets the mixed track ship in the reel; the loops themselves must not be
 * redistributed, which is why they are decoded into the ignored `out/` folder and never committed.
 */
const { execFileSync } = require('node:child_process');
const { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const arrangement = require('./arrangement.cjs');

const library = '/Library/Audio/Apple Loops';
const out = path.join(__dirname, '..', 'out');
const decoded = path.join(out, 'loops');

/** Every `.caf` in the library, by name. */
function findLoops(dir, found = new Map()) {
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
	const browser = await chromium.launch();
	const tab = await browser.newPage();

	await tab.goto('file://' + path.join(out, 'market-day-reel.html') + '#record');
	await tab.waitForFunction(() => window.reel);
	const end = await tab.evaluate(() => window.reel.END);
	const parts = arrangement(end);
	const available = findLoops(library);
	const loops = {};

	mkdirSync(decoded, { recursive: true });

	for (const name of new Set(parts.map((part) => part.loop))) {
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
		async ({ loops, end, parts }) => {
			const rate = 44100;
			const ctx = new OfflineAudioContext(2, Math.ceil(end * rate), rate);
			const buffers = {};

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
				const buffer = buffers[part.loop];
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
				let node = gain;

				if (part.lowpass) {
					const filter = ctx.createBiquadFilter();

					filter.frequency.setValueAtTime(part.lowpass[0], part.start);
					filter.frequency.exponentialRampToValueAtTime(part.lowpass[1], part.end);
					gain.connect(filter);
					node = filter;
				}

				const pan = ctx.createStereoPanner();
				const send = ctx.createGain();

				pan.pan.value = part.pan ?? 0;
				send.gain.value = part.verb ?? 0.3;
				node.connect(pan).connect(master);
				pan.connect(send).connect(room);

				for (let t = part.start - (part.offset ?? 0); t < part.end; t += length) {
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
				peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
			}

			// Normalised to just under full scale, then written as 16-bit PCM.
			const scale = (0.89 / peak) * 32767;
			const frames = left.length;
			const file = new DataView(new ArrayBuffer(44 + frames * 4));
			const text = (offset, value) =>
				[...value].forEach((char, i) => file.setUint8(offset + i, char.charCodeAt(0)));

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
				file.setInt16(44 + i * 4, left[i] * scale, true);
				file.setInt16(46 + i * 4, right[i] * scale, true);
			}

			const bytes = new Uint8Array(file.buffer);
			let binary = '';

			for (let i = 0; i < bytes.length; i += 32768) {
				binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
			}

			return btoa(binary);
		},
		{ loops, end, parts },
	);

	await browser.close();
	const wavPath = path.join(out, 'soundtrack.wav');

	writeFileSync(wavPath, Buffer.from(wav, 'base64'));
	execFileSync('afconvert', [
		'-f',
		'm4af',
		'-d',
		'aac',
		'-b',
		'192000',
		wavPath,
		path.join(__dirname, '..', 'soundtrack.m4a'),
	]);
	console.log('Wrote out/soundtrack.wav and soundtrack.m4a; rebuild the page to embed it.');
})();
