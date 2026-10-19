import { fileURLToPath } from 'node:url';

import { mergeConfig, defineConfig, configDefaults } from 'vitest/config';

import viteConfig from './vite.config';

/**
 * Unit tests, in jsdom, against the app's own Vite config. Run with `pnpm run test:unit`.
 *
 * Story tests live in `vitest.config.ts` instead; see the note there for why the two are never
 * loaded together.
 */
export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			environment: 'jsdom',
			exclude: [...configDefaults.exclude, 'e2e/**', 'e2e-queue/**'],
			root: fileURLToPath(new URL('./', import.meta.url)),
			setupFiles: ['./src/test-setup.ts'],
		},
	}),
);
