/**
 * Screenshots the built reel at the given times (in seconds), for checking a change without
 * rendering the whole video, and reports any error the page raised in normal or `#dev` mode.
 *
 *   node packages/presentations/stills.ts 12 27.5 40
 *   node packages/presentations/stills.ts queue-desk 12 27.5 40
 *
 * Writes `out/<name>/stills/<time>.png`. Needs `npx playwright install chromium` once.
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

import { videoFromArgs } from './videos.ts';

const dir = path.dirname(fileURLToPath(import.meta.url));

const times = process.argv
	.slice(2)
	.filter((arg) => !Number.isNaN(Number(arg)))
	.map(Number);

void (async () => {
	const { name } = videoFromArgs();
	const page = 'file://' + path.join(dir, 'out', name + '.html');
	const stills = path.join(dir, 'out', name, 'stills');
	const browser = await chromium.launch();
	const tab = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
	const errors: string[] = [];

	tab.on('pageerror', (error) => errors.push(error.message));
	mkdirSync(stills, { recursive: true });
	await tab.goto(page + '#record');
	await tab.waitForFunction(() => window.reel);
	await tab.evaluate(() => document.fonts.ready);

	for (const time of times) {
		await tab.evaluate(async (t) => {
			window.reel.seek(t);
			await window.reel.settle();
		}, time);
		// Lets CSS transitions started by the seek settle before the picture is taken.
		await tab.waitForTimeout(1300);
		await tab.screenshot({ path: path.join(stills, `${time}.png`) });
	}

	// A fresh tab: changing only the hash would not reload the page into dev mode.
	const devTab = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

	devTab.on('pageerror', (error) => errors.push(error.message));
	await devTab.goto(page + '#dev');
	await devTab.waitForSelector('#beats li');
	const beats = await devTab.$$eval('#beats li', (rows) => rows.length);

	await browser.close();
	console.log(`${times.length} stills, ${beats} beats in #dev mode, errors: ${errors.length}`);
	errors.forEach((error) => console.log('  ' + error));
	process.exitCode = errors.length ? 1 : 0;
})();
