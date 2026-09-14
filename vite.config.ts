import { fileURLToPath, URL } from 'node:url';

import netlify from '@netlify/vite-plugin';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Source maps are uploaded to Sentry only when the build has credentials for it — a fresh clone,
 * a local `npm run build`, and the unit test run all have none, and none of them should be
 * talking to Sentry. Set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` on the Netlify
 * site to turn minified stack traces back into this repository's source.
 */
const sentry = {
	authToken: process.env.SENTRY_AUTH_TOKEN,
	org: process.env.SENTRY_ORG,
	project: process.env.SENTRY_PROJECT,
};
const uploadsSourceMaps = Boolean(sentry.authToken && sentry.org && sentry.project);

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		netlify(),
		...(uploadsSourceMaps
			? [
					sentryVitePlugin({
						...sentry,
						telemetry: false,
						// The maps go to Sentry and are then removed from `dist`, so nothing ships a
						// readable copy of the source to guests along with the app.
						sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
					}),
				]
			: []),
	],
	// Sentry's own tree-shaking flag: it strips the SDK's debug logging, which is dead weight in a
	// bundle a guest downloads on a phone.
	define: { __SENTRY_DEBUG__: 'false' },
	build: {
		// `hidden` emits the maps for the upload without leaving a `sourceMappingURL` behind.
		sourcemap: uploadsSourceMaps ? 'hidden' : false,
	},
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
});
