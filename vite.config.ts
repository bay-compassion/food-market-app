import { fileURLToPath, URL } from 'node:url';

import netlify from '@netlify/vite-plugin';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

import { launchDarklySettings } from './src/launchdarkly-settings';

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

/**
 * Every Netlify build — production, deploy preview, and branch deploy alike — must ship with a
 * real LaunchDarkly project. Without one, `main.tsx` refuses to start, so a bundle built without
 * the client ID would be a blank page for every guest; failing here keeps it from going live at
 * all, and the last good deploy keeps serving. `VITE_LAUNCHDARKLY_DISABLED` exists for test rigs
 * that must stay off the network and is refused here for the same reason. Local builds, CI, and
 * Storybook are not Netlify builds and are left to the runtime check.
 */
function requireLaunchDarklyOnNetlify(): Plugin {
	return {
		name: 'require-launchdarkly-on-netlify',
		apply: 'build',
		configResolved(config) {
			if (process.env.NETLIFY !== 'true') {
				return;
			}

			const settings = launchDarklySettings(config.env);

			if (settings.status === 'missing') {
				throw new Error(
					'VITE_LAUNCHDARKLY_CLIENT_ID is not set for this Netlify deploy context. Every context ' +
						'(production, deploy previews, branch deploys) needs it, scoped to Builds.',
				);
			}

			if (settings.status === 'disabled') {
				throw new Error('VITE_LAUNCHDARKLY_DISABLED is for test rigs only; unset it on Netlify.');
			}
		},
	};
}

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		requireLaunchDarklyOnNetlify(),
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
