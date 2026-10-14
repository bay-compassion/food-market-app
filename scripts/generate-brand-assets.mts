/** Raster compatibility assets derived from the original Canva SVGs. Run with npx tsx. */
import { readFile, writeFile } from 'node:fs/promises';

import { launchChromium } from './screenshots/chromium.mjs';

const publicFile = (name: string) => new URL(`../public/${name}`, import.meta.url);
const browser = await launchChromium();

try {
	const page = await browser.newPage();
	const originalIcon = await readFile(publicFile('bay-compassion-icon-closed.svg'), 'utf8');
	const path = originalIcon.match(/<path[^>]*\sd="([^"]+)"/)?.[1];

	if (!path) {
		throw new Error('The supplied closed icon has no outline.');
	}

	// The outer circle in the supplied path supplies the exact clipping and white underlay.
	// Crop the print artboard to that circle so small digital icons use the available pixels.
	const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="191.48 126.62 2362.8 2362.8" width="512" height="512"><circle cx="1372.88" cy="1308.02" r="1181.4" fill="#fff"/><path fill="#275c63" d="${path}"/></svg>`;

	await writeFile(publicFile('bay-compassion-icon-digital.svg'), icon);
	const brandCss = await readFile(new URL('../src/styles/brand.css', import.meta.url), 'utf8');

	await writeFile(publicFile('brand.css'), brandCss);

	for (const asset of [
		{ name: 'bay-compassion-logo.png', size: 512, padding: 0, source: icon },
		{ name: 'favicon.png', size: 64, padding: 0, source: icon },
		{ name: 'icon-192.png', size: 192, padding: 24, source: icon, background: '#ffffff' },
		{ name: 'icon-512.png', size: 512, padding: 64, source: icon, background: '#ffffff' },
		{
			name: 'notification-badge.png',
			size: 96,
			padding: 8,
			source: originalIcon,
			monochrome: true,
		},
	]) {
		const data = await page.evaluate(async (asset) => {
			const canvas = document.createElement('canvas');

			canvas.width = asset.size;
			canvas.height = asset.size;
			const context = canvas.getContext('2d');

			if (!context) {
				throw new Error('Canvas rendering is unavailable.');
			}

			if (asset.background) {
				context.fillStyle = asset.background;
				context.fillRect(0, 0, canvas.width, canvas.height);
			}

			const image = new Image();

			image.src = `data:image/svg+xml;base64,${btoa(asset.source)}`;
			await image.decode();
			const scale = Math.min(
				(canvas.width - asset.padding * 2) / image.width,
				(canvas.height - asset.padding * 2) / image.height,
			);
			const width = image.width * scale;
			const height = image.height * scale;

			context.drawImage(
				image,
				(canvas.width - width) / 2,
				(canvas.height - height) / 2,
				width,
				height,
			);

			if (asset.monochrome) {
				context.globalCompositeOperation = 'source-in';
				context.fillStyle = '#ffffff';
				context.fillRect(0, 0, canvas.width, canvas.height);
			}

			return canvas.toDataURL('image/png').split(',')[1];
		}, asset);

		if (!data) {
			throw new Error(`No PNG data for ${asset.name}`);
		}
		await writeFile(publicFile(asset.name), Buffer.from(data, 'base64'));
		console.log(`Generated ${asset.name}`);
	}
	// Portable images for README renderers that cannot load our fonts and styles.
	const font = await readFile(publicFile('fonts/area-normal-extrabold.woff2'));

	for (const [name, color] of [
		['brand-lockup.png', '#000'],
		['brand-lockup-white.png', '#fff'],
		['wordmark.png', '#000'],
	] as const) {
		await page.setViewportSize({ width: 640, height: 160 });
		await page.setContent(
			`<style>@font-face{font-family:'Area Normal';src:url(data:font/woff2;base64,${font.toString('base64')});font-weight:800}:root{--font-heading:'Area Normal';--brand-lockup-size:60px}body{margin:8px;color:${color}}${brandCss}</style><span class="brand-lockup"><img class="brand-lockup__icon" src="data:image/svg+xml;base64,${Buffer.from(icon).toString('base64')}" alt=""><span class="brand-lockup__name"><span>The Bay</span><span>Compassion</span></span></span>`,
		);
		await page.evaluate(() => document.fonts.ready);
		await page
			.locator('.brand-lockup')
			.screenshot({ path: publicFile(name).pathname, omitBackground: true });
		console.log(`Generated ${name}`);
	}
} finally {
	await browser.close();
}
