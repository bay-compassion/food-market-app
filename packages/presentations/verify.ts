/** Browser checks for the published players; run after publish.ts. No frame capture or encoding. */
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

import { languages, translations } from '../../src/locales.ts';
import { videos } from './videos.ts';

const dir = path.dirname(fileURLToPath(import.meta.url));

void (async () => {
	const browser = await chromium.launch();
	const errors: string[] = [];
	const stills = path.join(dir, 'out/guest-guide/review');

	mkdirSync(stills, { recursive: true });

	try {
		const site = await browser.newPage();

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
			await site.goto('file://' + path.join(dir, 'out/site/guest-guide/index.html'));
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
			await site.goto('file://' + path.join(dir, 'out/site/queue-desk/index.html'));
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

		guest.on('pageerror', (error) => errors.push(`guest-guide: ${error.message}`));
		await guest.goto('file://' + path.join(dir, 'out/guest-guide.html') + '#watch');
		await guest.waitForFunction(() => window.reel);
		await guest.evaluate(() => document.fonts.ready);
		const cues = await guest.evaluate(() => window.reel.cues);
		const staticLayout = await guest.addStyleTag({
			content:
				'#phoneLocation, #kioskLocation, #cap, .guide-scroll { transition: none !important; } #cap .inner, .app.swap { animation: none !important; }',
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
					await guest.evaluate((t) => window.reel.seek(t), cue.t + cue.duration * 0.9);
					await guest.waitForTimeout(25);
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

				await guest.evaluate((t) => window.reel.seek(t), cue.t + cue.duration * 0.75);
				await guest.waitForTimeout(1200);
				await guest
					.locator('#viewport')
					.screenshot({ path: path.join(stills, `${width}-${id}.png`) });
			}
		}
		// Changing locales while the consent sheet is open must replace it, never stack sheets.
		const consent = cues.find((cue) => cue.id === 'texts')!;

		await guest.evaluate((t) => window.reel.seek(t), consent.t + consent.duration * 0.75);
		await guest.locator('#presentationLocale').selectOption('ar');
		await guest.locator('#presentationLocale').selectOption('fa');
		assert.equal(await guest.locator('.guide-consent').count(), 1);
		assert.equal(await guest.locator('.guide-consent').getAttribute('dir'), 'rtl');
		await guest.setViewportSize({ width: 1280, height: 850 });
		await guest.goto('file://' + path.join(dir, 'out/guest-guide.html') + '#dev');
		await guest.waitForSelector('#beats li');
		await guest.waitForLoadState('networkidle');
		assert.ok((await guest.locator('#beats li').count()) > 30);
		await guest.locator('#beats li button').nth(5).click();
		assert.ok((await guest.evaluate(() => window.reel.tl.time())) > 0);
		assert.deepEqual(errors, []);
		console.log(
			'Portrait and landscape review stills saved; RTL consent and Dev controls checked; no page errors.',
		);
	} finally {
		await browser.close();
	}
})().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
