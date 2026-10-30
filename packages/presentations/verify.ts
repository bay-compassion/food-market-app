/** Browser checks for the published players; run after publish.ts. No frame capture or encoding. */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium, webkit, type Page } from 'playwright';

import { languages, translations } from '../../src/locales.ts';
import { videos } from './videos.ts';

const dir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Full screen shows the video alone: as large as the window allows in one direction and within it
 * in the other, with its controls over it. Runs in the page, so it stands alone.
 */
function fillsScreen(): boolean {
	const stage = document.querySelector('#viewport')!.getBoundingClientRect();
	const controls = document.querySelector('#controlsBar')!.getBoundingClientRect();
	const below = document.querySelector('#pageControls')!.getBoundingClientRect();

	return (
		stage.top >= 0 &&
		stage.left >= 0 &&
		stage.bottom <= innerHeight + 1 &&
		stage.right <= innerWidth + 1 &&
		(Math.abs(stage.width - innerWidth) < 1 || Math.abs(stage.height - innerHeight) < 1) &&
		controls.top >= stage.top &&
		controls.bottom <= stage.bottom + 1 &&
		below.height === 0
	);
}

/**
 * A frame's phone (`#guestPhone`, `#adminPhone`), with every animation at rest — CSS transitions
 * finished, endless ones at their start — so two pictures of the same moment differ only if what
 * they show does.
 *
 * Transitions still running are left to end on their own rather than finished on the spot. A phone
 * rebuilt by a seek starts its 0.8-second scroll transitions afresh, and a picture taken the moment
 * one of them is cut short can catch text in the countdown strip drawn a shade lighter than it is
 * once the compositor has caught up. The wait is capped so one long animation can't hold verify up.
 */
async function phoneShot(page: Page, selector: string): Promise<string> {
	await page.evaluate(async () => {
		const documents = [document, document.querySelector('iframe')?.contentDocument];
		const animations = () => documents.flatMap((doc) => doc?.getAnimations() ?? []);
		const ending = animations().filter(
			(animation) =>
				animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity,
		);

		await Promise.race([
			// A transition a rebuild cancels rejects `finished`, which is still an end.
			Promise.allSettled(ending.map((animation) => animation.finished)),
			new Promise((resolve) => setTimeout(resolve, 2000)),
		]);

		for (const animation of animations()) {
			if (animation.effect?.getTiming().iterations === Infinity) {
				animation.pause();
				animation.currentTime = 0;
			} else {
				animation.finish();
			}
		}
	});

	return (await page.locator(selector).screenshot()).toString('base64');
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
 * A moment of a guide whose screen is a frame must look the same however the viewer reached it: by
 * seeking straight there, by seeking back to it from the end, after a change of language and back
 * (where the guide has a language), or by playing up to it — which is how capture reaches every
 * frame.
 *
 * Checked with the phone at full size. A few pixels may still differ where text is anti-aliased a
 * hair differently; a phone that shows something else differs in thousands.
 */
const ANTI_ALIASING_PIXELS = 24;

async function sameHoweverReached(
	page: Page,
	{ name, phone, ids, stills }: { name: string; phone: string; ids: string[]; stills: string },
): Promise<void> {
	const settle = () => page.evaluate(() => window.reel.settle());
	const seek = async (t: number) => {
		await page.evaluate((t) => window.reel.seek(t), t);
		await settle();
	};
	const end = await page.evaluate(() => window.reel.END);
	const cues = await page.evaluate(() => window.reel.cues);
	const localized = (await page.locator('#presentationLocale').count()) > 0;

	let most = 0;

	await page.setViewportSize({ width: 1920, height: 1080 });

	for (const id of ids) {
		const cue = cues.find((cue) => cue.id === id)!;
		const t = cue.t + cue.duration * 0.75;

		await seek(t);
		const direct = await phoneShot(page, phone);

		await seek(end - 1);
		await seek(t);
		const back = await phoneShot(page, phone);
		const ways: [string, string][] = [['seeking back to it', back]];

		if (localized) {
			await page.locator('#presentationLocale').selectOption('ar');
			await settle();
			await page.locator('#presentationLocale').selectOption('en');
			await settle();
			ways.push(['changing language and back', await phoneShot(page, phone)]);
		}

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
		ways.push(['playing up to it', await phoneShot(page, phone)]);

		for (const [how, shot] of ways) {
			const differing = await differingPixels(page, direct, shot);

			most = Math.max(most, differing);

			if (differing > ANTI_ALIASING_PIXELS) {
				// Both pictures, to see what differs.
				const file = `${id}-${how.replaceAll(' ', '-')}`;

				writeFileSync(path.join(stills, `${file}-direct.png`), Buffer.from(direct, 'base64'));
				writeFileSync(path.join(stills, `${file}.png`), Buffer.from(shot, 'base64'));
			}
			assert.ok(
				differing <= ANTI_ALIASING_PIXELS,
				`${name} ${id}: the same after ${how} (${differing} pixels differ)`,
			);
		}
	}
	console.log(
		`${name}: each moment looks the same however it is reached (at most ${most} pixels differ)`,
	);
}

/**
 * The admin guide against the dashboard as it is today. Every narration line is visited at its
 * start, middle and end, and must find every mark it points at and taps, ask the frame's server
 * nothing it doesn't answer, and raise no error. This is what makes the guide repeatable: a
 * change to a dashboard screen either reaches the video on the next build, or fails here by name.
 */
async function verifyAdminGuide(page: Page, stills: string): Promise<void> {
	const errors: string[] = [];

	page.on('pageerror', (error) => errors.push(error.message));
	page.on('console', (message) => {
		if (message.type() === 'error') {
			errors.push(message.text());
		}
	});
	page.on('request', (request) => {
		if (
			!/^(data:|blob:|file:|https:\/\/(cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com)\/)/.test(
				request.url(),
			)
		) {
			errors.push(`requested ${request.url()}`);
		}
	});
	await page.setViewportSize({ width: 1920, height: 1080 });
	await page.goto('file://' + path.join(dir, 'out/admin-guide.html') + '#watch');
	await page.waitForFunction(() => window.reel);
	await page.evaluate(() => window.reel.settle());
	const cues = await page.evaluate(() => window.reel.cues);

	for (const cue of cues) {
		for (const fraction of [0.1, 0.5, 0.9]) {
			await page.evaluate(
				async (t) => {
					window.reel.seek(t);
					await window.reel.settle();
				},
				cue.t + cue.duration * fraction,
			);
		}
		await page.waitForTimeout(900);
		await page.locator('#adminPhone').screenshot({ path: path.join(stills, `${cue.id}.png`) });
	}

	const frame = page.frames()[1]!;

	assert.deepEqual(
		await frame.evaluate(() => window.admin?.missing?.()),
		[],
		'admin-guide: every mark the narration points at is on the dashboard',
	);
	assert.deepEqual(
		await frame.evaluate(() => window.admin?.unanswered()),
		[],
		'admin-guide: the dashboard asked only what the guide answers',
	);
	await page.addStyleTag({
		content:
			'#phoneLocation, #cap { transition: none !important; } #cap .inner { animation: none !important; }',
	});

	for (const width of [320, 390, 1280]) {
		await page.setViewportSize({ width, height: width > 600 ? 850 : 960 });

		for (const cue of cues) {
			await page.evaluate(
				async (t) => {
					window.reel.seek(t);
					await window.reel.settle();
				},
				cue.t + cue.duration * 0.9,
			);
			const overflow = await page.evaluate(() => {
				const rect = (selector: string) =>
					document.querySelector(selector)!.getBoundingClientRect();
				const stage = rect('#stage');
				const cap = rect('#cap');
				const phase = document.querySelector<HTMLElement>('#stage')!.dataset.phase;

				return {
					page: document.body.scrollWidth > innerWidth,
					caption: cap.bottom > stage.bottom,
					controls: rect('#pageControls').right > innerWidth + 1,
					overlap: innerWidth <= 600 && phase === 'phone' && cap.bottom > rect('#adminPhone').top,
				};
			});

			assert.deepEqual(
				overflow,
				{ page: false, caption: false, controls: false, overlap: false },
				`admin-guide ${width}px/${cue.id}: fits`,
			);
		}
	}
	await page.setViewportSize({ width: 390, height: 960 });
	await page.locator('#viewport').screenshot({ path: path.join(stills, 'portrait.png') });
	await sameHoweverReached(page, {
		name: 'admin-guide',
		phone: '#adminPhone',
		ids: [
			'registered',
			'overrides',
			'grace',
			'pending',
			'overview',
			'admission',
			'message',
			'database',
			'reports',
			'next',
		],
		stills,
	});
	assert.deepEqual(errors, [], 'admin-guide: no page errors or outside requests');
	console.log(
		`admin-guide: ${cues.length} narration lines on the real dashboard; stills in out/admin-guide/review`,
	);
}

/** Delayed media startup and GSAP lag recovery must not repeatedly seek or restart the audio. */
async function verifyPlaybackRecovery(page: Page, name: string): Promise<void> {
	const startup = await page.evaluate(async () => {
		const media = document.querySelector('audio')!;
		const play = media.play.bind(media);
		let attempts = 0;

		// Keep the element paused while its play promise is pending, as a slow decoder can do.
		media.play = () => {
			attempts++;

			return new Promise<void>((resolve, reject) => {
				setTimeout(() => void play().then(resolve, reject), 300);
			});
		};

		try {
			document.getElementById('play')!.click();
			await new Promise((resolve) => setTimeout(resolve, 700));

			return { attempts, playing: !media.paused };
		} finally {
			media.play = play;
			document.getElementById('play')!.click();
		}
	});

	assert.equal(startup.attempts, 1, `${name}: one play request while audio is starting`);
	assert.equal(startup.playing, true, `${name}: delayed audio starts`);
	await page.locator('#play').click();
	await page.waitForFunction(() => {
		const media = document.querySelector('audio')!;

		return (
			!media.paused && !media.seeking && media.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
		);
	});
	const recovery = await page.evaluate(() => {
		const media = document.querySelector('audio')!;
		const before = media.currentTime;

		// Reproduce an animation clock left behind by a dropped frame or GSAP's lag smoothing.
		window.reel.tl.time(Math.max(0, before - 0.6));

		return { before, after: media.currentTime, animation: window.reel.tl.time() };
	});

	assert.ok(recovery.after >= recovery.before, `${name}: lag recovery does not seek audio back`);
	assert.ok(
		Math.abs(recovery.animation - recovery.after) < 0.15,
		`${name}: animation catches up to uninterrupted audio (${JSON.stringify(recovery)})`,
	);
	await page.locator('#play').click();
}

void (async () => {
	const browser = await (process.argv.includes('--webkit') ? webkit : chromium).launch();
	const errors: string[] = [];
	const stills = path.join(dir, 'out/guest-guide/review');

	mkdirSync(stills, { recursive: true });

	try {
		if (process.argv.includes('--playback-only')) {
			for (const name of Object.keys(videos)) {
				const page = await browser.newPage();

				await page.goto('file://' + path.join(dir, 'out', name + '.html'));
				await page.locator('#play:enabled').waitFor();
				await page.evaluate(() => window.reel.soundtrackReady);
				await page.locator('#play').click();
				await page.waitForFunction(() => document.querySelector('audio')!.currentTime > 0.3);
				await page.locator('#play').click();
				await verifyPlaybackRecovery(page, name);
				await page.close();
				console.log(`${name}: delayed audio startup and animation lag recovery checked`);
			}

			return;
		}

		// Serve the published embeds at one origin so the iPhone fallback can expand its iframe.
		const embedded = await browser.newPage({ viewport: { width: 390, height: 844 } });

		embedded.on('pageerror', (error) => errors.push(`fullscreen: ${error.message}`));
		await embedded.route('https://presentation.test/**', (route) => {
			const pathname = new URL(route.request().url()).pathname;

			return route.fulfill({
				contentType: 'text/html',
				body: readFileSync(path.join(dir, 'out/site', pathname)),
			});
		});

		for (const video of Object.values(videos)) {
			await embedded.goto(`https://presentation.test/${video.publish.folder}/index.html`);
			const player = embedded.frameLocator('.player iframe');

			await player.locator('#fullscreen').waitFor();
			await player.locator('body').evaluate(() => {
				Object.defineProperty(document, 'fullscreenEnabled', { value: false });
			});
			const initial = await embedded.locator('.player iframe').getAttribute('style');

			await player.locator('#fullscreen').click();

			for (const size of [
				{ width: 390, height: 844 },
				{ width: 844, height: 390 },
			]) {
				await embedded.setViewportSize(size);
				await embedded.waitForFunction(() => {
					const rect = document.querySelector('.player iframe')!.getBoundingClientRect();

					return (
						rect.x === 0 && rect.y === 0 && rect.width === innerWidth && rect.height === innerHeight
					);
				});
				const frame = embedded
					.frames()
					.find((frame) => frame.parentFrame() === embedded.mainFrame())!;

				await frame.waitForFunction(fillsScreen);
			}
			await embedded.setViewportSize({ width: 390, height: 844 });
			await player.locator('#fullscreen').click();
			assert.equal(await embedded.locator('.player iframe').getAttribute('style'), initial ?? '');
		}
		await embedded.close();
		console.log('Mobile embedded full-screen fallback and rotation checked for every walkthrough.');

		const site = await browser.newPage();
		const root = path.join(dir, 'out/site/index.html');

		await site.goto('file://' + root);
		assert.equal(await site.locator('h1').count(), 1);
		assert.equal(await site.locator('.guides a').count(), Object.keys(videos).length);
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
				2 + Object.keys(videos).length - 1,
				'Every page links to every other presentation',
			);
			assert.equal((await site.content()).includes('__INTERACTIVE__'), false);
		}

		for (const width of [320, 390, 608, 640, 932, 1024, 1280]) {
			await site.setViewportSize({ width, height: 960 });
			await site.goto('file://' + path.join(dir, 'out/site/presentations/guest-guide/index.html'));
			const player = site.frames()[1]!;

			await player.waitForFunction(() => window.reel);
			await player.evaluate(() => document.fonts.ready);

			for (const { code } of languages) {
				await player.locator('#presentationLocale').selectOption(code);
				const layout = await player.evaluate(() => ({
					width: innerWidth,
					controlsBottom: document.querySelector('#pageControls')!.getBoundingClientRect().bottom,
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

			if (width === 1280) {
				// Native select chrome and font metrics differ across macOS and Linux. Reproduce
				// the extra control row that previously squeezed the Tagalog stage in CI.
				await player.locator('#presentationLocale').selectOption('tl');
				await player.addStyleTag({
					content:
						'#pageControls { font-size: 18px !important; }' +
						'#pageControls select { padding-inline: 40px !important; }',
				});
				const layout = await player.evaluate(() => ({
					ratio:
						document.querySelector('#viewport')!.clientWidth /
						document.querySelector('#viewport')!.clientHeight,
					controlsBottom: document.querySelector('#pageControls')!.getBoundingClientRect().bottom,
					height: innerHeight,
				}));

				assert.ok(Math.abs(layout.ratio - 16 / 9) < 0.02, 'Wider controls preserve stage ratio');
				assert.ok(layout.controlsBottom <= layout.height, 'Wider controls fit the embedded frame');
			}

			// The staff guides' chapters sit in the row below the video at every width.
			for (const name of ['queue-desk', 'admin-guide']) {
				await site.goto('file://' + path.join(dir, `out/site/presentations/${name}/index.html`));
				const player = site.frames()[1]!;

				await player.waitForFunction(() => window.reel);
				assert.ok(
					await player.evaluate(
						() =>
							document.querySelector('#pageControls')!.getBoundingClientRect().bottom <=
							innerHeight,
					),
					`${width}/${name}: embedded controls fit`,
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
			await page.goto('file://' + path.join(dir, 'out', name + '.html'));
			await page.waitForFunction(() => window.reel);
			const audioDuration = await page.evaluate(
				async () => (await window.reel.soundtrackReady)?.duration ?? 0,
			);
			const duration = await page.evaluate(() => window.reel.END);

			assert.ok(
				Math.abs(audioDuration - duration) < 0.2,
				`${name}: soundtrack length matches timeline`,
			);
			const voiceDuration = await page.evaluate(
				async () => (await window.reel.loadVoiceTrack())?.duration ?? null,
			);

			if ('narration' in videos[name as keyof typeof videos]) {
				assert.ok(
					voiceDuration !== null && Math.abs(voiceDuration - duration) < 0.2,
					`${name}: voice track length matches timeline`,
				);
			}
			assert.equal(
				await page.locator('#music').count(),
				voiceDuration === null ? 0 : 1,
				`${name}: a music toggle exactly when there is a voice track`,
			);
			assert.equal(await page.locator('#play').getAttribute('aria-label'), 'Play');
			await page.waitForFunction(
				() => !(document.querySelector('#play') as HTMLButtonElement).disabled,
			);
			await page.waitForTimeout(350);
			assert.equal(
				await page.evaluate(() => window.reel.tl.time()),
				0,
				`${name}: no autoplay without a hash`,
			);
			assert.equal(
				await page.locator('#devOpen').isVisible(),
				false,
				`${name}: editing controls hidden`,
			);
			// Native full screen includes the controls, and exiting preserves the paused playhead.
			await page.locator('#fullscreen').click();
			await page.waitForFunction(
				() =>
					!!document.fullscreenElement &&
					document.querySelector('#fullscreen')!.getAttribute('aria-pressed') === 'true',
			);
			assert.equal(
				await page.locator('#fullscreen').getAttribute('aria-label'),
				'Exit Full Screen',
			);
			await page.locator('#fullscreen').click();
			await page.waitForFunction(
				() =>
					!document.fullscreenElement &&
					document.querySelector('#fullscreen')!.getAttribute('aria-pressed') === 'false',
			);
			// Exercise the mobile fallback even when this browser supports native full screen.
			await page.evaluate(() =>
				Object.defineProperty(document, 'fullscreenEnabled', { value: false }),
			);
			await page.locator('#fullscreen').click();
			await page.waitForFunction(() =>
				document.documentElement.classList.contains('presentation-fullscreen'),
			);

			for (const size of [
				{ width: 320, height: 740 },
				{ width: 844, height: 390 },
			]) {
				await page.setViewportSize(size);
				await page.waitForFunction(fillsScreen);
			}
			await page.keyboard.press('Escape');
			assert.equal(await page.locator('#fullscreen').getAttribute('aria-pressed'), 'false');
			await page.setViewportSize({ width: 390, height: 844 });

			assert.equal(await page.locator('#sound').getAttribute('aria-pressed'), 'true');
			assert.equal(await page.evaluate(() => window.reel.tl.time()), 0);
			assert.equal(await page.evaluate(() => document.querySelector('audio')!.paused), true);
			await page.locator('#play').click();
			await page.waitForFunction(() => window.reel.tl.time() > 0.3);
			// The sound comes from a media element, which an iPhone plays with its silent switch on.
			await page.waitForFunction(() => {
				const media = document.querySelector('audio')!;

				return !media.paused && Math.abs(media.currentTime - window.reel.tl.time()) < 0.3;
			});
			await page.locator('#play').click();
			assert.equal(
				await page.evaluate(() => document.querySelector('audio')!.paused),
				true,
				`${name}: the sound pauses with the video`,
			);
			assert.equal(await page.evaluate(() => window.reel.tl.paused()), true);
			// A tap on the video plays and pauses it, and the controls fade while it plays untouched.
			assert.equal(await page.locator('#volume').inputValue(), '50', `${name}: half volume`);
			const tapVideo = () => page.locator('#tapSurface').click({ position: { x: 12, y: 12 } });
			const idle = () =>
				page.evaluate(() => document.querySelector('#viewport')!.classList.contains('idle'));

			await tapVideo();
			assert.equal(await page.evaluate(() => window.reel.tl.paused()), false, `${name}: tap plays`);
			await page.waitForFunction(() =>
				document.querySelector('#viewport')!.classList.contains('idle'),
			);
			await tapVideo();
			assert.equal(await page.evaluate(() => window.reel.tl.paused()), true, `${name}: tap pauses`);
			assert.equal(await idle(), false, `${name}: controls show while paused`);
			await verifyPlaybackRecovery(page, name);
			// Space plays and pauses, and the arrows skip ten seconds, unless a control has focus.
			await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
			await page.evaluate(() => window.reel.seek(20));
			await page.keyboard.press('ArrowRight');
			assert.ok(Math.abs((await page.evaluate(() => window.reel.tl.time())) - 30) < 0.01);
			await page.keyboard.press('ArrowLeft');
			await page.keyboard.press('ArrowLeft');
			assert.ok(Math.abs((await page.evaluate(() => window.reel.tl.time())) - 10) < 0.01);
			await page.keyboard.press(' ');
			assert.equal(await page.evaluate(() => window.reel.tl.paused()), false, `${name}: Space`);
			await page.keyboard.press(' ');
			assert.equal(await page.evaluate(() => window.reel.tl.paused()), true);
			// The arrows still skip with a button focused, as one is after it's clicked.
			const before = await page.evaluate(() => window.reel.tl.time());

			await page.locator('#restart').focus();
			await page.keyboard.press('ArrowRight');
			assert.ok(
				Math.abs((await page.evaluate(() => window.reel.tl.time())) - before - 10) < 0.01,
				`${name}: arrows with a button focused`,
			);
			// Space plays and pauses there too, as on YouTube, rather than pressing Restart.
			await page.keyboard.press(' ');
			assert.equal(await page.evaluate(() => window.reel.tl.paused()), false);
			await page.keyboard.press(' ');
			assert.equal(await page.evaluate(() => window.reel.tl.paused()), true);
			assert.ok(
				(await page.evaluate(() => window.reel.tl.time())) >= before + 10 - 0.01,
				`${name}: Space with a button focused plays, not presses it`,
			);

			if (voiceDuration !== null) {
				await page.locator('#music').click();
				assert.equal(await page.locator('#music').getAttribute('aria-pressed'), 'false');
				await page.locator('#music').click();
			}
			// Check hover on a wide desktop layout; phones use their hardware volume controls.
			const volumeWidth = () =>
				page.evaluate(() => document.querySelector('#volume')!.getBoundingClientRect().width);

			await page.setViewportSize({ width: 1280, height: 900 });
			await page.mouse.move(0, 0);
			await page.waitForFunction(
				() => document.querySelector('#volume')!.getBoundingClientRect().width === 0,
			);
			await page.locator('#sound').hover();
			await page.waitForFunction(
				() => document.querySelector('#volume')!.getBoundingClientRect().width > 80,
			);
			assert.ok((await volumeWidth()) > 80, `${name}: volume opens from the speaker`);
			await page.locator('#volume').fill('40');
			await page.setViewportSize({ width: 390, height: 844 });
			assert.equal(
				await page.evaluate(() => document.querySelector('#pageControls')!.lastElementChild!.id),
				'devOpen',
				`${name}: Dev is the last control`,
			);
			await page.locator('#scrub').fill('600');
			assert.ok(
				Math.abs((await page.evaluate(() => window.reel.tl.time())) - duration * 0.6) < 0.1,
			);
			const chapters = await page.evaluate(() => window.reel.chapters);
			const time = () => page.evaluate(() => window.reel.tl.time());

			if (chapters.length) {
				// On a phone too, the chapter list sits below the video, with no menu to open first.
				assert.equal(await page.locator('#chapter').isVisible(), true, `${name}: chapters`);
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
			console.log(
				`${name}: audio, play/pause, keys, music, volume, seek, chapters, restart and end checked`,
			);
			await page.close();
		}
		const guest = await browser.newPage();
		// Fonts and GSAP are the only things a presentation loads; the guest phone talks to nobody.
		const allowed =
			/^(data:|blob:|file:|about:|https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)\/)/;

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
					await guest.locator('#play').getAttribute('aria-label'),
					translations[code].guestView.presentation.play,
				);

				for (const cue of cues) {
					await seek(cue.t + cue.duration * 0.9);
					const overflow = await guest.evaluate(() => {
						const rect = (selector: string) =>
							document.querySelector(selector)!.getBoundingClientRect();
						const stage = rect('#stage');
						const cap = rect('#cap');
						const controls = rect('#pageControls');
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
			console.log(
				`guest-guide: every narration scene in ${languages.length} locales at ${width}px`,
			);
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
		await sameHoweverReached(guest, {
			name: 'guest-guide',
			phone: '#guestPhone',
			ids: [
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
			],
			stills,
		});
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
		const adminStills = path.join(dir, 'out/admin-guide/review');

		mkdirSync(adminStills, { recursive: true });
		await verifyAdminGuide(await browser.newPage(), adminStills);
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
