import { fileURLToPath } from 'node:url';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react-swc';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

/**
 * The React half of the story test run, matching `vitest.storybook.config.ts` for `.storybook`.
 *
 * Storybook takes one framework per configuration, so the two Storybooks each need their own test
 * config: this one renders `.storybook-react`'s `.tsx` stories and runs their `play` functions.
 * `npm run test:storybook` runs both. They collapse back into one once the last Vue component is
 * gone.
 */
export default defineConfig({
	plugins: [
		// This file is its own vite config — `vite.config.ts` is not loaded — so the React plugin and
		// the `@` alias have to be declared here or every `.tsx` import fails to parse. Declaring
		// them rather than merging the app config is what keeps the Netlify dev-server plugin out.
		react(),
		// Returns a promise of several plugins; Vite resolves those in place, so no await is needed.
		storybookTest({
			configDir: '.storybook-react',
			storybookScript: 'npm run storybook:react',
		}),
	],
	resolve: {
		alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
	},
	test: {
		name: 'storybook-react',
		root: fileURLToPath(new URL('./', import.meta.url)),
		setupFiles: ['./.storybook-react/vitest.setup.ts'],
		browser: {
			enabled: true,
			headless: true,
			provider: playwright(),
			instances: [{ browser: 'chromium' }],
		},
	},
});
