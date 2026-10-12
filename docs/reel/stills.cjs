/**
 * Screenshots the built reel at the given times (in seconds), for checking a change without
 * rendering the whole video, and reports any error the page raised in normal or `#dev` mode.
 *
 *   node docs/reel/stills.cjs 12 27.5 40
 *
 * Writes `out/stills/<time>.png`. Needs `npx playwright install chromium` once.
 */
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const page = 'file://' + path.join(__dirname, 'out', 'market-day-reel.html');
const times = process.argv.slice(2).map(Number);

void (async () => {
	const browser = await chromium.launch();
	const tab = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
	const errors = [];

	tab.on('pageerror', (error) => errors.push(error.message));
	mkdirSync(path.join(__dirname, 'out', 'stills'), { recursive: true });
	await tab.goto(page + '#record');
	await tab.waitForFunction(() => window.reel);
	await tab.evaluate(() => document.fonts.ready);

	for (const time of times) {
		await tab.evaluate((t) => window.reel.seek(t), time);
		// Lets CSS transitions started by the seek settle before the picture is taken.
		await tab.waitForTimeout(1300);
		await tab.screenshot({ path: path.join(__dirname, 'out', 'stills', `${time}.png`) });
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
