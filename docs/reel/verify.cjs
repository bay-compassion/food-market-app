/** Browser checks for the published players; run after publish.mjs. No frame capture or encoding. */
const assert = require('node:assert/strict');
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

void (async () => {
	const { videos } = await import('./videos.mjs');
	const { translations, languages } = await import('../../src/locales.ts');
	const reviewName =
		process.argv.slice(2).find((name) => videos[name]?.publish.guest) ?? 'guest-guide';
	const reviewLocale = videos[reviewName].locale ?? 'en';
	const browser = await chromium.launch();
	const errors = [];
	const stills = path.join(__dirname, 'out/' + reviewName + '/review');

	mkdirSync(stills, { recursive: true });

	try {
		const site = await browser.newPage();

		for (const video of Object.values(videos)) {
			await site.goto(
				'file://' + path.join(__dirname, 'out/site', video.publish.folder, 'index.html'),
			);
			assert.equal(
				await site.locator('.links a').count(),
				Object.values(videos).filter((video) => video.publish).length + 1,
				'Every page links to the other presentations',
			);
			assert.equal((await site.content()).includes('__INTERACTIVE__'), false);
		}

		for (const width of [320, 390, 608, 640, 1280]) {
			await site.setViewportSize({ width, height: 960 });
			await site.goto('file://' + path.join(__dirname, 'out/site/guest-guide/index.html'));
			const player = site.frames()[1];

			await player.waitForFunction(() => window.reel);

			for (const { code } of languages) {
				await player.locator('#presentationLocale').selectOption(code);
				const layout = await player.evaluate(() => ({
					width: innerWidth,
					controlsBottom: document.querySelector('#controls').getBoundingClientRect().bottom,
					height: innerHeight,
					viewportHeight: document.querySelector('#viewport').clientHeight,
					viewportWidth: document.querySelector('#viewport').clientWidth,
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
			await page.goto('file://' + path.join(__dirname, 'out', name + '.html') + '#watch');
			await page.waitForFunction(() => window.reel);
			const audioDuration = await page.evaluate(
				async () => (await window.reel.soundtrackReady).duration,
			);
			const duration = await page.evaluate(() => window.reel.END);

			assert.ok(
				Math.abs(audioDuration - duration) < 0.2,
				`${name}: soundtrack length matches timeline`,
			);
			assert.equal(
				await page.locator('#play').textContent(),
				translations[videos[name].locale ?? 'en'].guestView.presentation.play,
			);
			await page.locator('#sound').click();
			await page.waitForFunction(
				() => document.querySelector('#sound').getAttribute('aria-pressed') === 'true',
			);
			await page.locator('#play').click();
			await page.waitForFunction(() => window.reel.tl.time() > 0.3);
			await page.locator('#play').click();
			assert.equal(await page.evaluate(() => window.reel.tl.paused()), true);
			await page.locator('#scrub').fill('600');
			assert.ok(
				Math.abs((await page.evaluate(() => window.reel.tl.time())) - duration * 0.6) < 0.1,
			);
			await page.locator('#restart').click();
			assert.ok((await page.evaluate(() => window.reel.tl.time())) < 1);
			await page.locator('#play').click();
			await page.evaluate(() => window.reel.seek(window.reel.END - 0.2));
			await page.locator('#play').click();
			await page.waitForFunction(() => window.reel.tl.progress() === 1);
			await page.waitForTimeout(350);
			assert.equal(await page.evaluate(() => window.reel.tl.progress()), 1, `${name}: plays once`);
			console.log(`${name}: audio, play/pause, seek, restart and end checked`);
			await page.close();
		}
		const guest = await browser.newPage();

		guest.on('pageerror', (error) => errors.push(`guest-guide: ${error.message}`));
		await guest.goto('file://' + path.join(__dirname, 'out', reviewName + '.html') + '#watch');
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
						const stage = document.querySelector('#stage').getBoundingClientRect();
						const cap = document.querySelector('#cap').getBoundingClientRect();
						const controls = document.querySelector('#controls').getBoundingClientRect();
						const phone = document.querySelector('#guestPhone').getBoundingClientRect();
						const phase = document.querySelector('#stage').dataset.phase;
						const kiosk = document.querySelector('#kiosk').getBoundingClientRect();

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
			console.log(`${reviewName}: every narration scene in eight locales at ${width}px`);
		}
		await staticLayout.evaluate((element) => element.remove());
		await guest.locator('#presentationLocale').selectOption(reviewLocale);

		for (const [width, height] of [
			[1920, 1080],
			[390, 960],
		]) {
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
				const cue = cues.find((cue) => cue.id === id);

				await guest.evaluate((t) => window.reel.seek(t), cue.t + cue.duration * 0.75);
				await guest.waitForTimeout(1200);
				await guest
					.locator('#viewport')
					.screenshot({ path: path.join(stills, `${width}-${id}.png`) });
			}
		}
		// Changing locales while the consent sheet is open must replace it, never stack sheets.
		const consent = cues.find((cue) => cue.id === 'texts');

		await guest.evaluate((t) => window.reel.seek(t), consent.t + consent.duration * 0.75);
		await guest.locator('#presentationLocale').selectOption('ar');
		await guest.locator('#presentationLocale').selectOption('fa');
		assert.equal(await guest.locator('.guide-consent').count(), 1);
		assert.equal(await guest.locator('.guide-consent').getAttribute('dir'), 'rtl');
		// A hash-only navigation keeps the watch page alive and races the DevTools load.
		// Match stills.cjs: initialize Dev mode in its own fresh document.
		const dev = await browser.newPage({ viewport: { width: 1280, height: 850 } });

		dev.on('pageerror', (error) => errors.push(`${reviewName}/dev: ${error.message}`));
		await dev.goto('file://' + path.join(__dirname, 'out', reviewName + '.html') + '#dev');
		await dev.waitForSelector('#beats li');
		await dev.waitForLoadState('networkidle');
		assert.ok((await dev.locator('#beats li').count()) > 30);
		const beat = dev.locator('#beats li button').nth(5);
		const beatTime = parseFloat(await beat.locator('time').textContent());

		await beat.click();
		await dev.waitForFunction((time) => Math.abs(window.reel.tl.time() - time) < 0.01, beatTime);
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
