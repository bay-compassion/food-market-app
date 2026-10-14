/**
 * Renders every frame of a built video to `out/<name>/frames/` at 30 fps, for `encode.swift` to turn into
 * a video. Rather than recording in real time, it moves the GSAP playhead one frame at a time and
 * steps every CSS animation and transition to the same clock, so each run is identical and smooth.
 *
 *   node packages/presentations/capture.ts
 *   node packages/presentations/capture.ts queue-desk
 *
 * About five minutes a minute of video. Needs `npx playwright install chromium` once.
 */
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

import { videoFromArgs } from './videos.ts';

declare global {
	interface Window {
		/** Moves the timeline and every CSS animation to one moment. */
		renderFrame: (seconds: number) => void;
	}

	interface Animation {
		/** When, on the timeline, capture first saw the animation. */
		bornAt?: number;
	}
}

const dir = path.dirname(fileURLToPath(import.meta.url));
const fps = 30;

void (async () => {
	const { name } = videoFromArgs();
	const frames = path.join(dir, 'out', name, 'frames');

	rmSync(frames, { recursive: true, force: true });
	mkdirSync(frames, { recursive: true });
	const browser = await chromium.launch();
	const tab = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
	const errors: string[] = [];

	tab.on('pageerror', (error) => errors.push(error.message));
	await tab.goto('file://' + path.join(dir, 'out', name + '.html') + '#record');
	await tab.waitForFunction(() => window.reel);
	await tab.evaluate(() => document.fonts.ready);
	await tab.evaluate(() => {
		window.renderFrame = (t) => {
			window.reel.tl.time(t);

			for (const animation of document.getAnimations()) {
				if (animation.bornAt === undefined) {
					animation.bornAt = t;
					animation.pause();
				}

				animation.currentTime = Math.max(0, (t - animation.bornAt) * 1000);
			}
		};
	});
	const end = await tab.evaluate(() => window.reel.END);
	const total = Math.ceil(end * fps);
	const started = Date.now();

	for (let i = 0; i <= total; i++) {
		await tab.evaluate((t) => window.renderFrame(t), i / fps);
		await tab.screenshot({
			path: path.join(frames, `${String(i).padStart(5, '0')}.jpg`),
			type: 'jpeg',
			quality: 92,
		});

		if (i % 300 === 0) {
			console.log(`frame ${i} / ${total} (${Math.round((Date.now() - started) / 1000)}s)`);
		}
	}

	await browser.close();
	console.log(`${total + 1} frames in out/${name}/frames, errors: ${errors.length}`);
	errors.forEach((error) => console.log('  ' + error));
})();
