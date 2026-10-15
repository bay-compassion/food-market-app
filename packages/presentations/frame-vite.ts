/**
 * The Vite setup every in-frame app shares (`phone/`, `admin/`): the app's own screens, built into
 * one page that `build.ts` inlines into a presentation. It reads no `.env`: a frame talks to no
 * service, and nothing from a developer's environment belongs in a public page.
 */
import { existsSync, readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin, type UserConfig } from 'vite';

import { brandFontCss } from './fonts.ts';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

const imageTypes: Record<string, string> = {
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.jpg': 'image/jpeg',
};

/** Swaps app modules (by path from the repository's `src/`) for a frame's own stand-ins. */
function stubbed(stubs: Map<string, string>): Plugin {
	return {
		name: 'presentations:frame-stubs',
		enforce: 'pre',
		async resolveId(source, importer, options) {
			const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });

			return resolved ? (stubs.get(resolved.id) ?? null) : null;
		},
	};
}

/**
 * The app names its `public/` images by path (`/bay-compassion-icon-closed.svg`), which a page opened from
 * a file has nowhere to serve from. The frame carries each one it names inside itself instead.
 */
const publicImages: Plugin = {
	name: 'presentations:frame-public-images',
	enforce: 'pre',
	transform(code, id) {
		if (id === here('../../src/styles/base.css')) {
			return code.replace("@import url('/fonts/brand.css');", brandFontCss);
		}

		if (!id.startsWith(here('../../src/'))) {
			return null;
		}

		return code.replace(
			/(["'])\/([\w.-]+\.(?:png|svg|jpg))\1/g,
			(literal, quote: string, name: string) => {
				const file = here(`../../public/${name}`);

				if (!existsSync(file)) {
					return literal;
				}

				const data = readFileSync(file).toString('base64');

				return `${quote}data:${imageTypes[extname(name)]};base64,${data}${quote}`;
			},
		);
	},
};

/**
 * A frame app's config: `name` is its folder here and under `out/`; `stubs` maps a module under
 * the repository's `src/` to its stand-in in the frame's own `stubs/` folder.
 */
export function frameConfig(name: string, stubs: Record<string, string>): UserConfig {
	return defineConfig({
		root: here(`./${name}`),
		base: './',
		envDir: here(`./${name}/no-env`),
		logLevel: 'warn',
		plugins: [
			stubbed(
				new Map(
					Object.entries(stubs).map(([app, stub]) => [
						here(`../../src/${app}`),
						here(`./${name}/stubs/${stub}`),
					]),
				),
			),
			publicImages,
			react(),
		],
		resolve: { alias: { '@': here('../../src') } },
		build: {
			outDir: here(`./out/${name}`),
			emptyOutDir: true,
			// Everything in the one page: no chunks to fetch, no assets beside it.
			assetsInlineLimit: Number.MAX_SAFE_INTEGER,
			cssCodeSplit: false,
			modulePreload: false,
			chunkSizeWarningLimit: 8192,
			rolldownOptions: { output: { codeSplitting: false } },
		},
	});
}
