/**
 * Builds the guest phone (`phone/index.html`) into `out/phone/`, as one page that `build.ts` then
 * inlines into the guest guide. It reads no `.env`: the phone talks to no service, and nothing
 * from a developer's environment belongs in a public page.
 */
import { existsSync, readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

import { brandFontCss } from '../fonts.ts';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/**
 * App modules the phone swaps for its own: the guest screens' menu imports sign-in and feedback,
 * and the phone has neither a session nor anyone to report to (see `phone/stubs/`).
 */
const stubs = new Map([
	[here('../../../src/auth.ts'), here('./stubs/auth.ts')],
	[here('../../../src/sentry-feedback-trigger.ts'), here('./stubs/sentry-feedback-trigger.ts')],
]);

const stubbed: Plugin = {
	name: 'presentations:phone-stubs',
	enforce: 'pre',
	async resolveId(source, importer, options) {
		const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });

		return resolved ? (stubs.get(resolved.id) ?? null) : null;
	},
};

const imageTypes: Record<string, string> = {
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.jpg': 'image/jpeg',
};

/**
 * The app names its `public/` images by path (`/bay-compassion-icon-closed.svg`), which a page opened from
 * a file has nowhere to serve from. The phone carries each one it names inside itself instead.
 */
const publicImages: Plugin = {
	name: 'presentations:phone-public-images',
	enforce: 'pre',
	transform(code, id) {
		if (id === here('../../../src/styles/base.css')) {
			return code.replace("@import url('/fonts/brand.css');", brandFontCss);
		}

		if (!id.startsWith(here('../../../src/'))) {
			return null;
		}

		return code.replace(
			/(["'])\/([\w.-]+\.(?:png|svg|jpg))\1/g,
			(literal, quote: string, name: string) => {
				const file = here(`../../../public/${name}`);

				if (!existsSync(file)) {
					return literal;
				}

				const data = readFileSync(file).toString('base64');

				return `${quote}data:${imageTypes[extname(name)]};base64,${data}${quote}`;
			},
		);
	},
};

export default defineConfig({
	root: here('.'),
	base: './',
	envDir: here('./no-env'),
	logLevel: 'warn',
	plugins: [stubbed, publicImages, react()],
	resolve: { alias: { '@': here('../../../src') } },
	build: {
		outDir: here('../out/phone'),
		emptyOutDir: true,
		// Everything in the one page: no chunks to fetch, no assets beside it.
		assetsInlineLimit: Number.MAX_SAFE_INTEGER,
		cssCodeSplit: false,
		modulePreload: false,
		chunkSizeWarningLimit: 4096,
		rolldownOptions: { output: { codeSplitting: false } },
	},
});
