import { fileURLToPath } from 'node:url';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

/**
 * Runs every story as a browser test: each one is rendered in headless Chromium, and any story
 * with a `play` function has that run too. It catches the things jsdom cannot — a component that
 * throws on mount, a broken decorator, a `play` step that no longer finds its button. Run it with
 * `pnpm run test:storybook`, after `pnpm exec playwright install chromium` once, or from the testing panel
 * in Storybook's sidebar.
 *
 * It is this file, rather than one with a more specific name, because Storybook's Vitest addon
 * finds the config its testing panel runs by looking for `vitest.config.*` in the project root.
 *
 * Unit tests are deliberately in `vitest.unit.config.ts` and never loaded alongside this. Building
 * `storybookTest` loads Storybook, which loads `.env` into `process.env` — and Vitest builds every
 * project a config lists, even ones `--project` filters out. A unit test sharing a process with
 * this would see the real Twilio credentials and feature flags in `.env`. Keeping the two apart
 * also means `pnpm run test:unit` and `pnpm run checks` need no browser binaries.
 *
 * It does not extend `vite.config.ts`, so the React plugin and the `@` alias are declared here.
 * Declaring them rather than merging the app config is what keeps the Netlify dev-server plugin
 * out of a component test run.
 */
export default defineConfig({
	plugins: [
		react(),
		// Returns a promise of several plugins; Vite resolves those in place, so no await is needed.
		// The addon applies `.storybook/preview.tsx` and the addons' annotations itself.
		storybookTest({
			configDir: fileURLToPath(new URL('./.storybook', import.meta.url)),
			storybookScript: 'pnpm run storybook',
		}),
	],
	resolve: {
		alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
	},
	test: {
		name: 'storybook',
		root: fileURLToPath(new URL('./', import.meta.url)),
		browser: {
			enabled: true,
			headless: true,
			// Temporary: CI sets this to capture Chromium's network errors on a failing run.
			provider: playwright(
				process.env.CHROMIUM_NET_LOG
					? { launchOptions: { args: [`--log-net-log=${process.env.CHROMIUM_NET_LOG}`] } }
					: {},
			),
			instances: [{ browser: 'chromium' }],
		},
	},
});
