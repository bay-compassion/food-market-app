import { fileURLToPath } from 'node:url';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

/**
 * Runs every story as a browser test: each one is rendered in headless Chromium, and any story
 * with a `play` function has that run too. It catches the things jsdom cannot — a component that
 * throws on mount, a broken decorator, a `play` step that no longer finds its button.
 *
 * This is deliberately a *separate* config from `vitest.config.ts` rather than a second project
 * inside it. Story tests need Playwright's browser binaries, which are a large download and not
 * something a fresh clone has; keeping them apart means `npm run test:unit` and `npm run checks`
 * still work with nothing but `npm install`.
 *
 * Run with `npm run test:storybook`, after `npx playwright install chromium` once.
 */
export default defineConfig({
	plugins: [
		// This file is its own vite config — `vite.config.ts` is not loaded — so the React plugin and
		// the `@` alias have to be declared here or every import fails to resolve. Declaring them
		// rather than merging the app config is what keeps the Netlify dev-server plugin out.
		react(),
		// Returns a promise of several plugins; Vite resolves those in place, so no await is needed.
		storybookTest({
			configDir: '.storybook',
			storybookScript: 'npm run storybook',
		}),
	],
	resolve: {
		alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
	},
	test: {
		name: 'storybook',
		root: fileURLToPath(new URL('./', import.meta.url)),
		setupFiles: ['./.storybook/vitest.setup.ts'],
		browser: {
			enabled: true,
			headless: true,
			provider: playwright(),
			instances: [{ browser: 'chromium' }],
		},
	},
});
