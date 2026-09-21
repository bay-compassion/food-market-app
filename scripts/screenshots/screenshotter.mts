import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import type { Browser, Page } from 'playwright';

import { translations, type Locale } from '../../src/locales.js';
import { launchChromium } from './chromium.mjs';
import { SceneFixtures, screenshotTimeZone } from './scene-fixtures.mjs';
import type { ScreenshotStep } from './screenshot-catalog.mjs';

export type Screenshot = {
	step: ScreenshotStep;
	/** Path of the PNG, relative to the output directory. */
	file: string;
	width: number;
	height: number;
	/** The page was taller than a sheet can carry legibly, so the screenshot shows only the top of it. */
	truncated: boolean;
};

/** A phone, matching the viewport `scripts/capture-twilio-opt-in.mts` shoots the real app at. */
const phone = { width: 390, height: 844 } as const;

/**
 * Beyond this a page stops being something you can read on paper: scaled to fit a sheet it would be
 * a sliver. The screenshot is cut off here, and says so.
 */
const maxHeight = 3_200;

/** How long a beat has to reach its screen before the run gives up on it. */
const anchorTimeoutMs = 15_000;

/** How long a run waits for web fonts before deciding they are not coming. */
const fontTimeoutMs = 10_000;

export class Screenshotter {
	private webFonts: 'pending' | 'loaded' | 'unavailable' = 'pending';

	private constructor(
		private readonly browser: Browser,
		private readonly baseUrl: string,
		private readonly outputDirectory: string,
		private readonly locale: Locale,
		private readonly settleMs: number,
		private readonly deviceScaleFactor: number,
	) {}

	static async open(options: {
		baseUrl: string;
		outputDirectory: string;
		locale: Locale;
		settleMs?: number;
		deviceScaleFactor?: number;
	}): Promise<Screenshotter> {
		await mkdir(path.join(options.outputDirectory, 'png'), { recursive: true });

		return new Screenshotter(
			await launchChromium(),
			options.baseUrl,
			options.outputDirectory,
			options.locale,
			options.settleMs ?? 350,
			// 2× gives roughly 300dpi once a phone screenshot is printed a couple of inches wide.
			options.deviceScaleFactor ?? 2,
		);
	}

	/**
	 * Captures one beat on a phone of its own — a fresh browser context, so nothing one beat
	 * saved on the device can leak into the next.
	 *
	 * Throws if the beat never reaches its screen, or cannot do what it asks of the guest.
	 */
	async capture(step: ScreenshotStep): Promise<Screenshot> {
		const copy = translations[this.locale];
		const fixtures = new SceneFixtures(step, this.locale);

		await using context = await this.newPhone();

		await fixtures.install(context);

		const page = await context.newPage();

		await page.goto(new URL(step.route ?? '/', `${this.baseUrl}/`).href, {
			waitUntil: 'domcontentloaded',
		});

		await this.during(step, `reaching “${step.anchor(copy)}” at ${step.route ?? '/'}`, async () => {
			await page
				.getByText(step.anchor(copy), { exact: false })
				.first()
				.waitFor({ timeout: anchorTimeoutMs });
			await this.settle(page);
		});

		if (step.interact) {
			await this.during(step, 'carrying out what the guest does next', async () => {
				await step.interact?.(page, copy);
				await this.settle(page);
			});
		}

		if (!step.overlay) {
			// Filling in a form scrolls the page, and a full-page shot taken from there catches the
			// sticky app bar halfway down the screen. An overlay keeps its place: that is what the
			// guest is looking at.
			await page.evaluate(() => window.scrollTo(0, 0));
		}

		const height = await page.evaluate(() => document.documentElement.scrollHeight);
		const truncated = !step.overlay && height > maxHeight;
		const file = path.join('png', `${step.id}.png`);

		await page.screenshot({
			path: path.join(this.outputDirectory, file),
			animations: 'disabled',
			caret: 'hide',
			scale: 'device',
			// The whole page, app bar to footer, is the point — unless a sheet or dialog is open, in
			// which case the screen is what a guest is looking at and the page behind it is not.
			fullPage: !step.overlay,
			...(truncated ? { clip: { x: 0, y: 0, width: phone.width, height: maxHeight } } : {}),
		});

		return {
			step,
			file,
			width: phone.width,
			height: step.overlay ? phone.height : Math.min(height, maxHeight),
			truncated,
		};
	}

	/**
	 * Runs one stage of a beat, and names the beat and the stage if it fails. A printed arc with a
	 * spinner, or the wrong screen, in the middle of it is worse than a run that stops.
	 */
	private async during(
		step: ScreenshotStep,
		stage: string,
		run: () => Promise<void>,
	): Promise<void> {
		try {
			await run();
		} catch (error) {
			throw new Error(`The screenshot “${step.id}” failed while ${stage}.`, {
				cause: error,
			});
		}
	}

	private newPhone() {
		return this.browser.newContext({
			viewport: phone,
			deviceScaleFactor: this.deviceScaleFactor,
			isMobile: true,
			hasTouch: true,
			colorScheme: 'light',
			reducedMotion: 'reduce',
			// A first visit has no saved language, so the app picks one from the browser's.
			locale: this.locale,
			timezoneId: screenshotTimeZone,
		});
	}

	private async settle(page: Page): Promise<void> {
		if (this.webFonts !== 'unavailable') {
			const loaded = await page.evaluate(
				(timeoutMs) =>
					Promise.race([
						document.fonts.ready.then(() => true),
						new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs)),
					]),
				fontTimeoutMs,
			);

			// `base.css` pulls Roboto from Google Fonts, so an offline or firewalled run would wait out
			// the same failure on every screen. Latch it after the first: whether the fonts arrive is a
			// property of the run rather than of a screen, and it is worth saying once that they did not.
			this.webFonts = loaded ? 'loaded' : 'unavailable';

			if (!loaded) {
				console.warn(
					`\nWeb fonts did not load within ${fontTimeoutMs / 1000}s — these screenshots use fallback ` +
						'faces. Check this machine can reach fonts.googleapis.com.',
				);
			}
		}

		await page.evaluate(() =>
			Promise.all(
				[...document.images]
					.filter((image) => !image.complete)
					.map(
						(image) =>
							new Promise((resolve) => {
								image.addEventListener('load', resolve, { once: true });
								image.addEventListener('error', resolve, { once: true });
							}),
					),
			),
		);
		await page.waitForTimeout(this.settleMs);
	}

	async [Symbol.asyncDispose](): Promise<void> {
		await this.browser.close();
	}
}
