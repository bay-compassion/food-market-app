import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import type { Browser, Page } from 'playwright';

import { launchChromium } from './chromium.mjs';
import type { StillFrame } from './still-catalog.mjs';
import { storyUrl, type StorybookStory } from './storybook-index.mjs';

export type Still = {
	story: StorybookStory;
	/** Path of the PNG, relative to the output directory. */
	file: string;
	width: number;
	height: number;
	/** The story was taller or wider than its frame allows and the still shows only part of it. */
	truncated: boolean;
	/** Storybook rendered an error instead of the story. */
	failed: boolean;
};

type Measurement = {
	width: number;
	height: number;
	/** A dialog, drawer, or menu is open in a portal, so the still has to keep the whole screen. */
	overlay: boolean;
	error: string;
};

/**
 * Measured inside the story's own page: `#storybook-root` grows past the viewport, so its scroll
 * height is the story's real height, while horizontal overflow shows up on the document.
 */
function measure(): Measurement {
	const root = document.querySelector('#storybook-root');
	const overlay = [...document.body.children].some((element) => {
		if (element === root || element.tagName === 'SCRIPT' || element.tagName === 'STYLE') {
			return false;
		}

		const rect = element.getBoundingClientRect();

		return rect.width > 0 && rect.height > 0;
	});
	const contentHeight = root instanceof HTMLElement ? root.scrollHeight : 0;

	return {
		width: document.documentElement.scrollWidth,
		height: overlay ? Math.max(contentHeight, window.innerHeight) : contentHeight,
		overlay,
		error: document.querySelector('#error-message')?.textContent?.trim() ?? '',
	};
}

/** How long a run waits for web fonts before deciding they are not coming. */
const fontTimeoutMs = 10_000;

function clamp(value: number, low: number, high: number): number {
	return Math.max(low, Math.min(high, value));
}

/** Filesystem-safe, stable, and still readable in a directory listing. */
function fileNameFor(story: StorybookStory): string {
	return `${story.id}.png`;
}

/**
 * Photographs stories one at a time in a single browser page. The frame decides how much screen a
 * story is given; the story decides how much of it it uses, within the frame's limits.
 */
export class StillPhotographer {
	private webFonts: 'pending' | 'loaded' | 'unavailable' = 'pending';

	private constructor(
		private readonly browser: Browser,
		private readonly page: Page,
		private readonly baseUrl: string,
		private readonly outputDirectory: string,
		private readonly globals: string | undefined,
		private readonly settleMs: number,
	) {}

	static async open(options: {
		baseUrl: string;
		outputDirectory: string;
		globals?: string;
		settleMs?: number;
		deviceScaleFactor?: number;
	}): Promise<StillPhotographer> {
		const browser = await launchChromium();
		const page = await browser.newPage({
			// 2× gives roughly 300dpi once a phone still is printed a couple of inches wide.
			deviceScaleFactor: options.deviceScaleFactor ?? 2,
			viewport: { width: 390, height: 844 },
			colorScheme: 'light',
			reducedMotion: 'reduce',
		});

		await mkdir(path.join(options.outputDirectory, 'png'), { recursive: true });

		return new StillPhotographer(
			browser,
			page,
			options.baseUrl,
			options.outputDirectory,
			options.globals,
			options.settleMs ?? 350,
		);
	}

	async capture(story: StorybookStory, frame: StillFrame): Promise<Still> {
		const { page } = this;

		await page.setViewportSize({ width: frame.width, height: Math.max(frame.minHeight, 844) });
		// `domcontentloaded` rather than `load`: the story is on screen long before every subresource
		// the page happens to reference has answered, and `settle()` waits for the ones that matter.
		await page.goto(storyUrl(this.baseUrl, story.id, this.globals), {
			waitUntil: 'domcontentloaded',
		});
		await page.waitForFunction(() => {
			const root = document.querySelector('#storybook-root');

			return (
				(root !== null && root.childElementCount > 0) ||
				(document.querySelector('#error-message')?.textContent?.trim().length ?? 0) > 0
			);
		});
		await this.settle();

		let measurement = await page.evaluate(measure);
		let truncated = false;

		// Resizing reflows the story, which can change its height again; two follow-up passes settle
		// everything short of a layout that oscillates, which nothing in this app does.
		for (let pass = 0; pass < 3; pass += 1) {
			const width = clamp(Math.max(measurement.width, frame.width), frame.width, frame.maxWidth);
			const height = clamp(Math.max(measurement.height, frame.minHeight), 1, frame.maxHeight);
			const viewport = page.viewportSize();

			truncated = measurement.width > frame.maxWidth || measurement.height > frame.maxHeight;

			if (viewport?.width === width && viewport.height === height) {
				break;
			}

			await page.setViewportSize({ width, height });
			await this.settle();
			measurement = await page.evaluate(measure);
		}

		const file = path.join('png', fileNameFor(story));

		await page.screenshot({
			path: path.join(this.outputDirectory, file),
			animations: 'disabled',
			caret: 'hide',
			scale: 'device',
		});

		const viewport = page.viewportSize() ?? { width: frame.width, height: frame.minHeight };

		return {
			story,
			file,
			width: viewport.width,
			height: viewport.height,
			truncated,
			failed: measurement.error.length > 0,
		};
	}

	private async settle(): Promise<void> {
		if (this.webFonts !== 'unavailable') {
			const loaded = await this.page.evaluate(
				(timeoutMs) =>
					Promise.race([
						document.fonts.ready.then(() => true),
						new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs)),
					]),
				fontTimeoutMs,
			);

			// `base.css` pulls Roboto from Google Fonts, so an offline or firewalled run would wait out
			// the same failure on every story. Latch it after the first: whether the fonts arrive is a
			// property of the run rather than of a story, and it is worth saying once that they did not.
			this.webFonts = loaded ? 'loaded' : 'unavailable';

			if (!loaded) {
				console.warn(
					`\nWeb fonts did not load within ${fontTimeoutMs / 1000}s — these stills use fallback ` +
						'faces. Check this machine can reach fonts.googleapis.com.',
				);
			}
		}

		await this.page.evaluate(() =>
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
		// Play functions run in the story's own page, so a beat here is what puts a submitting form
		// or an open menu in the still rather than the state it started in.
		await this.page.waitForTimeout(this.settleMs);
	}

	async [Symbol.asyncDispose](): Promise<void> {
		await this.browser.close();
	}
}
