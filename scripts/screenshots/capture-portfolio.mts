/** Refresh the public portfolio assets without a backend or real guest data. */
import { mkdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { brandFontCss } from '../../packages/presentations/fonts.js';
import { adminTranslations } from '../../src/adminLocales.js';
import { SessionStatusEnum } from '../../src/services/sessionStateMachine.js';
import { AppServer } from './app-server.mjs';
import { launchChromium } from './chromium.mjs';
import type { ScreenshotStep } from './screenshot-catalog.mjs';
import { Screenshotter } from './screenshotter.mjs';
import { StorybookServer } from './storybook-server.mjs';

const output = fileURLToPath(new URL('../../docs/images/portfolio/', import.meta.url));
const staging = path.join(output, '.staging');

await mkdir(staging, { recursive: true });

try {
	await using app = await AppServer.start(5198);
	const registration: ScreenshotStep = {
		id: 'registration',
		market: SessionStatusEnum.REGISTRATION_OPEN,
		anchor: (copy) => copy.guestView.forms.lotteryLegend,
	};
	const waiting: ScreenshotStep = {
		id: 'waiting',
		guest: 'identified',
		market: SessionStatusEnum.SERVICE_STARTED,
		visit: { status: 'waiting', queuePosition: 12, aheadOfYou: 4 },
		anchor: (copy) => copy.guestView.visitStatus.waiting.header,
	};

	for (const [locale, step] of [
		['en', registration],
		['fa', { ...registration, id: 'farsi' }],
		['en', waiting],
	] as const) {
		await using camera = await Screenshotter.open({
			baseUrl: app.baseUrl,
			outputDirectory: staging,
			locale,
		});

		await camera.capture(step, { fullPage: false });
		console.log(`Captured ${step.id}`);
	}

	await using storybook = await StorybookServer.start(6098);
	const browser = await launchChromium();

	try {
		const page = await browser.newPage({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
		});

		await page.goto(
			`${storybook.baseUrl}/iframe.html?id=admin-queue-queue--during-service&viewMode=story&globals=locale:en`,
		);
		await page.getByRole('button', { name: adminTranslations.en.callNext, exact: false }).waitFor();
		await page.evaluate(() => document.fonts.ready);
		await page.screenshot({ path: path.join(staging, 'png/queue.png'), animations: 'disabled' });
		console.log('Captured queue');

		await page.setViewportSize({ width: 1200, height: 630 });
		await page.goto(
			new URL('../../packages/presentations/portfolio/social.html', import.meta.url).href,
		);
		// The source card opens from disk; embed its fonts just as the presentation build does.
		await page.addStyleTag({ content: brandFontCss });
		await page.evaluate(() => document.fonts.ready);
		await page.screenshot({
			path: path.join(staging, 'png/social.png'),
			animations: 'disabled',
			scale: 'css',
		});
		console.log('Captured social preview');
	} finally {
		await browser.close();
	}

	// Publish the curated set only after every screen has reached its expected state.
	for (const name of ['registration', 'farsi', 'waiting', 'queue', 'social']) {
		await rename(path.join(staging, 'png', `${name}.png`), path.join(output, `${name}.png`));
	}
	console.log(`Portfolio assets → ${output}`);
} finally {
	await rm(staging, { recursive: true, force: true });
}
