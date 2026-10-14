/** Browser checks for the published players; run after publish.ts. No frame capture or encoding. */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium, type Page } from 'playwright';

import { languages, translations } from '../../src/locales.ts';
import type { Cue } from './stage/reel.ts';
import { videos } from './videos.ts';

const dir = path.dirname(fileURLToPath(import.meta.url));

/**
 * The guest phone, with every animation at rest — CSS transitions finished, endless ones at their
 * start — so two pictures of the same moment differ only if what they show does.
 */
async function phoneShot(page: Page): Promise<string> {
	await page.evaluate(() => {
		const documents = [document, document.querySelector('iframe')?.contentDocument];

		for (const animation of documents.flatMap((doc) => doc?.getAnimations() ?? [])) {
			if (animation.effect?.getTiming().iterations === Infinity) {
				animation.pause();
				animation.currentTime = 0;
			} else {
				animation.finish();
			}
		}
	});

	return (await page.locator('#guestPhone').screenshot()).toString('base64');
}

/** How many pixels two pictures of the same size differ in. */
function differingPixels(page: Page, first: string, second: string): Promise<number> {
	return page.evaluate(
		async ([a, b]) => {
			const pixels = async (base64: string) => {
				const image = new Image();

				image.src = 'data:image/png;base64,' + base64;
				await image.decode();
				const canvas = new OffscreenCanvas(image.width, image.height);
				const context = canvas.getContext('2d')!;

				context.drawImage(image, 0, 0);

				return context.getImageData(0, 0, image.width, image.height).data;
			};
			const [p, q] = [await pixels(a), await pixels(b)];
			let count = 0;

			for (let i = 0; i < p.length; i += 4) {
				if (
					Math.abs(p[i]! - q[i]!) +
						Math.abs(p[i + 1]! - q[i + 1]!) +
						Math.abs(p[i + 2]! - q[i + 2]!) >
					24
				) {
					count++;
				}
			}

			return count;
		},
		[first, second] as const,
	);
}

/**
 * A moment of the guest guide must look the same however the viewer reached it: by seeking
 * straight there, by seeking back to it from the end, after a change of language and back, or by
 * playing up to it — which is how capture reaches every frame.
 *
 * Checked with the phone at full size. A few pixels may still differ where text is anti-aliased a
 * hair differently; a phone that shows something else differs in thousands.
 */
const ANTI_ALIASING_PIXELS = 24;

async function sameHoweverReached(page: Page, cues: Cue[], stills: string): Promise<void> {
	const settle = () => page.evaluate(() => window.reel.settle());
	const seek = async (t: number) => {
		await page.evaluate((t) => window.reel.seek(t), t);
		await settle();
	};
	const end = await page.evaluate(() => window.reel.END);

	let most = 0;

	await page.setViewportSize({ width: 1920, height: 1080 });

	for (const id of [
		'identity',
		'returning',
		'join',
		'registered',
		'texts',
		'number',
		'called',
		'late',
		'missed',
		'help',
	]) {
		const cue = cues.find((cue) => cue.id === id)!;
		const t = cue.t + cue.duration * 0.75;

		await seek(t);
		const direct = await phoneShot(page);

		await seek(end - 1);
		await seek(t);
		const back = await phoneShot(page);

		await page.locator('#presentationLocale').selectOption('ar');
		await settle();
		await page.locator('#presentationLocale').selectOption('en');
		await settle();
		const relocalized = await phoneShot(page);

		await seek(t - 2);

		for (let frame = 1; frame <= 60; frame++) {
			await page.evaluate(
				(t) => {
					window.reel.tl.time(t);
				},
				t - 2 + frame / 30,
			);
			await settle();
		}
		const played = await phoneShot(page);

		for (const [how, shot] of [
			['seeking back to it', back],
			['changing language and back', relocalized],
			['playing up to it', played],
		] as const) {
			const differing = await differingPixels(page, direct, shot);

			most = Math.max(most, differing);

			if (differing > ANTI_ALIASING_PIXELS) {
				// Both pictures, to see what differs.
				const name = `${id}-${how.replaceAll(' ', '-')}`;

				writeFileSync(path.join(stills, `${name}-direct.png`), Buffer.from(direct, 'base64'));
				writeFileSync(path.join(stills, `${name}.png`), Buffer.from(shot, 'base64'));
			}
			assert.ok(
				differing <= ANTI_ALIASING_PIXELS,
				`${id}: the same after ${how} (${differing} pixels differ)`,
			);
		}
	}
	console.log(
		`guest-guide: each moment looks the same however it is reached (at most ${most} pixels differ)`,
	);
}

void (async () => {
	const browser = await chromium.launch();
	const errors: string[] = [];
	const stills = path.join(dir, 'out/guest-guide/review');

	mkdirSync(stills, { recursive: true });

	try {
		const site = await browser.newPage();
		const root = path.join(dir, 'out/site/index.html');

		await site.goto('file://' + root);
		assert.equal(await site.locator('h1').count(), 1);
		assert.equal(await site.locator('.guides a').count(), 3);
		assert.equal((await site.content()).includes('__BASE__'), false);
		assert.equal((await site.content()).includes('__REPO__'), false);

		// Relative links must survive a repository subpath and work in a local preview.
		for (const href of await site
			.locator('a[href], link[href]')
			.evaluateAll((elements) => elements.map((element) => element.getAttribute('href')!))) {
			if (href.startsWith('http') || href.startsWith('#')) {
				continue;
			}

			assert.ok(existsSync(path.resolve(path.dirname(root), href)), `Missing link: ${href}`);
		}

		for (const width of [320, 390, 1280]) {
			await site.setViewportSize({ width, height: 900 });
			await site.goto('file://' + root);
			await site.evaluate(() => document.fonts.ready);
			await site.evaluate(async () => {
				const images = [...document.images];

				await Promise.all(
					images.map((image) => {
						image.loading = 'eager';

						return image.decode();
					}),
				);
			});
			assert.ok(
				await site.evaluate(() =>
					[...document.images].every((image) => image.complete && image.naturalWidth > 0),
				),
				'Every portfolio image loads',
			);
			assert.ok(
				await site.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
				`${width}: portfolio fits the viewport`,
			);
			await site.screenshot({ path: path.join(stills, `portfolio-${width}.png`), fullPage: true });
		}

		for (const [oldPath, destination] of [
			['guest-guide/index.html', 'presentations/guest-guide/index.html'],
			['queue-desk/index.html', 'presentations/queue-desk/index.html'],
			['guest-guide/guest-guide.html', 'presentations/guest-guide/guest-guide.html'],
			['queue-desk/queue-desk.html', 'presentations/queue-desk/queue-desk.html'],
			['reel.html', 'presentations/market-day-reel/reel.html'],
		] as const) {
			await site.goto('file://' + path.join(dir, 'out/site', oldPath));
			await site.waitForURL('file://' + path.join(dir, 'out/site', destination));
		}

		for (const video of Object.values(videos)) {
			await site.goto('file://' + path.join(dir, 'out/site', video.publish.folder, 'index.html'));
			assert.equal(
				await site.locator('.links a').count(),
				4,
				'Every page links to both other presentations',
			);
			assert.equal((await site.content()).includes('__INTERACTIVE__'), false);
		}

		for (const width of [320, 390, 608, 640, 932, 1024, 1280]) {
			await site.setViewportSize({ width, height: 960 });
			await site.goto('file://' + path.join(dir, 'out/site/presentations/guest-guide/index.html'));
			const player = site.frames()[1]!;

			await player.waitForFunction(() => window.reel);

			for (const { code } of languages) {
				await player.locator('#presentationLocale').selectOption(code);
				const layout = await player.evaluate(() => ({
					width: innerWidth,
					controlsBottom: document.querySelector('#controls')!.getBoundingClientRect().bottom,
					height: innerHeight,
					viewportHeight: document.querySelector('#viewport')!.clientHeight,
					viewportWidth: document.querySelector('#viewport')!.clientWidth,
				}));
				const ratio = layout.width <= 600 ? 9 / 16 : 16 / 9;

				assert.ok(
					layout.controlsBottom <= layout.height,
					`${width}/${code}: embedded controls fit`,
				);
				assert.ok(
					Math.abs(layout.viewportWidth / layout.viewportHeight - ratio) < 0.02,
					`${width}/${code}: embedded stage fits`,
				);
			}

			// The queue desk's chapters wrap onto a row of their own below 1000px; its frame grows to fit.
			await site.goto('file://' + path.join(dir, 'out/site/presentations/queue-desk/index.html'));
			const desk = site.frames()[1]!;

			await desk.waitForFunction(() => window.reel);
			assert.ok(
				await desk.evaluate(
					() => document.querySelector('#controls')!.getBoundingClientRect().bottom <= innerHeight,
				),
				`${width}/queue-desk: embedded controls fit`,
			);
		}

		await site.close();
		console.log(
			'Pages navigation and embedded players checked, including parent/iframe breakpoints.',
		);

		if (process.argv.includes('--site-only')) {
			return;
		}

		for (const name of Object.keys(videos)) {
			const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

			page.on('pageerror', (error) => errors.push(`${name}: ${error.message}`));
			await page.goto('file://' + path.join(dir, 'out', name + '.html') + '#watch');
			await page.waitForFunction(() => window.reel);
			const audioDuration = await page.evaluate(
				async () => (await window.reel.soundtrackReady)?.duration ?? 0,
			);
			const duration = await page.evaluate(() => window.reel.END);

			assert.ok(
				Math.abs(audioDuration - duration) < 0.2,
				`${name}: soundtrack length matches timeline`,
			);
			assert.equal(await page.locator('#play').textContent(), 'Play');
			await page.locator('#sound').click();
			await page.waitForFunction(
				() => document.querySelector('#sound')!.getAttribute('aria-pressed') === 'true',
			);
			await page.locator('#play').click();
			await page.waitForFunction(() => window.reel.tl.time() > 0.3);
			await page.locator('#play').click();
			assert.equal(await page.evaluate(() => window.reel.tl.paused()), true);
			await page.locator('#scrub').fill('600');
			assert.ok(
				Math.abs((await page.evaluate(() => window.reel.tl.time())) - duration * 0.6) < 0.1,
			);
			const chapters = await page.evaluate(() => window.reel.chapters);
			const time = () => page.evaluate(() => window.reel.tl.time());

			if (chapters.length) {
				const current = chapters.findLastIndex((chapter) => chapter.t <= duration * 0.6);

				await page.locator('#nextChapter').click();
				assert.ok(Math.abs((await time()) - chapters[current + 1]!.t) < 0.01, `${name}: next`);
				await page.locator('#prevChapter').click();
				assert.ok(Math.abs((await time()) - chapters[current]!.t) < 0.01, `${name}: previous`);
				await page.locator('#chapter').selectOption(String(chapters.length - 1));
				assert.ok(Math.abs((await time()) - chapters.at(-1)!.t) < 0.01, `${name}: chapter list`);
				assert.equal(await page.locator('#nextChapter').isDisabled(), true);
				assert.equal(await page.evaluate(() => window.reel.tl.paused()), true, `${name}: paused`);
				// Step by step holds the end of a chapter, then plays on across it when asked.
				const boundary = chapters[2]!.t;

				await page.locator('#stepMode').click();
				assert.equal(await page.locator('#stepMode').getAttribute('aria-pressed'), 'true');
				await page.evaluate((t) => window.reel.seek(t), boundary - 0.6);
				await page.locator('#play').click();
				await page.waitForFunction(() => window.reel.tl.paused(), null, { timeout: 3000 });
				assert.ok(Math.abs((await time()) - (boundary - 0.05)) < 0.01, `${name}: held at end`);
				await page.locator('#play').click();
				await page.waitForFunction((t) => window.reel.tl.time() > t + 0.2, boundary);
				await page.locator('#play').click();
				await page.locator('#stepMode').click();
				await page.locator('#chapter').selectOption('0');
				assert.equal(await time(), 0, `${name}: first chapter opens on the title`);
			} else {
				assert.equal(await page.locator('#chapters').count(), 0, `${name}: no chapters`);
			}
			await page.locator('#restart').click();
			assert.ok((await page.evaluate(() => window.reel.tl.time())) < 1);
			await page.locator('#play').click();
			await page.evaluate(() => window.reel.seek(window.reel.END - 0.2));
			await page.locator('#play').click();
			await page.waitForFunction(() => window.reel.tl.progress() === 1);
			await page.waitForTimeout(350);
			assert.equal(await page.evaluate(() => window.reel.tl.progress()), 1, `${name}: plays once`);
			console.log(`${name}: audio, play/pause, seek, chapters, restart and end checked`);
			await page.close();
		}
		const guest = await browser.newPage();
		// Fonts and GSAP are the only things a presentation loads; the guest phone talks to nobody.
		const allowed =
			/^(data:|file:|about:|https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)\/)/;

		guest.on('pageerror', (error) => errors.push(`guest-guide: ${error.message}`));
		guest.on('console', (message) => {
			if (message.type() === 'error') {
				errors.push(`guest-guide: ${message.text()}`);
			}
		});
		guest.on('request', (request) => {
			if (!allowed.test(request.url())) {
				errors.push(`guest-guide requested ${request.url()}`);
			}
		});
		await guest.goto('file://' + path.join(dir, 'out/guest-guide.html') + '#watch');
		await guest.waitForFunction(() => window.reel);
		await guest.evaluate(() => window.reel.settle());
		const cues = await guest.evaluate(() => window.reel.cues);
		const seek = (t: number) =>
			guest.evaluate(async (t) => {
				window.reel.seek(t);
				await window.reel.settle();
			}, t);
		const staticLayout = await guest.addStyleTag({
			content:
				'#phoneLocation, #kioskLocation, #cap { transition: none !important; } #cap .inner, .app.swap { animation: none !important; }',
		});

		for (const width of [320, 390, 600, 1280]) {
			await guest.setViewportSize({ width, height: width > 600 ? 850 : 960 });

			for (const { code } of languages) {
				await guest.locator('#presentationLocale').selectOption(code);
				assert.equal(
					await guest.locator('#play').textContent(),
					translations[code].guestView.presentation.play,
				);

				for (const cue of cues) {
					await seek(cue.t + cue.duration * 0.9);
					const overflow = await guest.evaluate(() => {
						const rect = (selector: string) =>
							document.querySelector(selector)!.getBoundingClientRect();
						const stage = rect('#stage');
						const cap = rect('#cap');
						const controls = rect('#controls');
						const phone = rect('#guestPhone');
						const phase = document.querySelector<HTMLElement>('#stage')!.dataset.phase;
						const kiosk = rect('#kiosk');

						return {
							page: document.body.scrollWidth > innerWidth,
							caption: cap.bottom > stage.bottom,
							controls: controls.right > innerWidth + 1,
							overlap: innerWidth <= 600 && phase !== 'title' && cap.bottom > phone.top,
							display: innerWidth <= 600 && phase === 'display' && phone.bottom > kiosk.top,
						};
					});

					assert.deepEqual(
						overflow,
						{ page: false, caption: false, controls: false, overlap: false, display: false },
						`${width}px/${code}/${cue.id}: fits`,
					);
				}
			}
			console.log(`guest-guide: every narration scene in eight locales at ${width}px`);
		}
		await staticLayout.evaluate((element) => (element as HTMLStyleElement).remove());
		await guest.locator('#presentationLocale').selectOption('en');

		for (const [width, height] of [
			[1920, 1080],
			[390, 960],
		] as const) {
			await guest.setViewportSize({ width, height });

			for (const id of [
				'window',
				'identity',
				'household',
				'returning',
				'join',
				'registered',
				'texts',
				'notSelected',
				'number',
				'display',
				'called',
				'checkin',
				'late',
				'missed',
				'finished',
				'missedWindow',
				'help',
			]) {
				const cue = cues.find((cue) => cue.id === id)!;

				await seek(cue.t + cue.duration * 0.75);
				await guest.waitForTimeout(1200);
				await guest
					.locator('#viewport')
					.screenshot({ path: path.join(stills, `${width}-${id}.png`) });
			}
		}
		// Changing locales while the consent sheet is open must replace it, never stack sheets.
		const consent = cues.find((cue) => cue.id === 'texts')!;
		const phone = guest.frameLocator('#guestPhone iframe');

		await seek(consent.t + consent.duration * 0.75);
		await guest.locator('#presentationLocale').selectOption('ar');
		await guest.locator('#presentationLocale').selectOption('fa');
		await guest.evaluate(() => window.reel.settle());
		assert.equal(await phone.locator('[role="dialog"]').count(), 1, 'one consent sheet');
		assert.equal(
			await phone.locator('html').getAttribute('dir'),
			'rtl',
			'the sheet reads right to left',
		);
		await guest.locator('#presentationLocale').selectOption('en');
		await sameHoweverReached(guest, cues, stills);
		assert.deepEqual(
			await guest.frames()[1]!.evaluate(() => window.phone?.unanswered()),
			[],
			'the guest phone asked only what the guide answers',
		);
		await guest.setViewportSize({ width: 1280, height: 850 });
		await guest.goto('file://' + path.join(dir, 'out/guest-guide.html') + '#dev');
		await guest.waitForSelector('#beats li');
		// GSDevTools moves the playhead as it starts; on a page that is already open only the hash
		// changes, so there is no network quiet to wait for — wait for its scrubber instead.
		await guest.waitForSelector('.gs-dev-tools');
		assert.ok((await guest.locator('#beats li').count()) > 30);
		await guest.locator('#beats li button').nth(5).click();
		assert.ok((await guest.evaluate(() => window.reel.tl.time())) > 0);
		assert.deepEqual(errors, []);
		console.log(
			'Portrait and landscape review stills saved; RTL consent, reaching each moment, and Dev controls checked; no page errors.',
		);
	} finally {
		await browser.close();
	}
})().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
