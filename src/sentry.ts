import type { LDReactClient } from '@launchdarkly/react-sdk';
import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import {
	createBrowserRouter,
	createRoutesFromChildren,
	matchRoutes,
	useLocation,
	useNavigationType,
} from 'react-router';

import { launchDarklySettings } from './launchdarkly-settings.ts';
import { sentrySettings } from './sentry-settings.ts';

/**
 * Browser-side Sentry, scoped to what the free Developer plan covers: errors, tracing,
 * error-triggered session replay, and opt-in user feedback. See `docs/observability.md` for the
 * quotas each one draws on and for the products deliberately left out.
 *
 * Sentry is inert with no `VITE_SENTRY_DSN` set, which is the case for local development, the
 * unit tests, Storybook, and the end-to-end suite — none of them should be spending quota.
 */

const settings = sentrySettings(import.meta.env);
const ldSettings = launchDarklySettings(import.meta.env);

/** The LaunchDarkly flag `enableReplayWhenFlagged` reads. Must exist in the project and default
 * to `false` — a flag key LaunchDarkly can't resolve evaluates to that `false` forever, which
 * looks identical to "off on purpose." */
const REPLAY_FLAG_KEY = 'sentry-replay-enabled';

function initializeSentry() {
	if (!settings) {
		return;
	}

	Sentry.init({
		dsn: settings.dsn,
		enabled: settings.enabled,
		environment: settings.environment,
		integrations: [
			Sentry.reactRouterBrowserTracingIntegration({
				useEffect,
				useLocation,
				useNavigationType,
				createRoutesFromChildren,
				matchRoutes,
			}),
		],
		tracesSampleRate: settings.tracesSampleRate,
		replaysSessionSampleRate: settings.replaysSessionSampleRate,
		replaysOnErrorSampleRate: settings.replaysOnErrorSampleRate,
		// Guests hand this app their name, phone number, and household details. Nothing that
		// identifies one of them belongs in an error report: no IP address, no cookies, no request
		// bodies, and no replay that has not had its text masked. `userInfo` is spelled out because an
		// omitted field takes the SDK's default, which infers the IP address. It has no effect on the
		// user `SentryUserReporter` sets explicitly in a beta build.
		dataCollection: { userInfo: false },
	});

	// With a LaunchDarkly project configured, `enableReplayWhenFlagged` decides this instead —
	// `main.tsx` calls it once the client exists, which happens after this function runs.
	if (ldSettings.status !== 'configured' && settings.replaysOnErrorSampleRate > 0) {
		void loadReplay();
	}
}

/**
 * Session replay, added after the first paint rather than bundled into the entry chunk.
 *
 * Replay is roughly as large as the rest of the SDK put together, and the guest screens are the
 * one download that stands between somebody on a phone and the queue. Pulling it in as its own
 * chunk keeps it off that critical path; the cost is that an error in the first moments of a page
 * load is reported without a replay attached.
 */
async function loadReplay() {
	const { addReplay } = await import('./sentry-replay.ts');

	addReplay();
}

/**
 * Turns on error replay at runtime, from `sentry-replay-enabled` instead of the build-time
 * `VITE_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE` switch `initializeSentry` otherwise uses — a project
 * that wants to flip replay on or off without a redeploy passes its LaunchDarkly client here.
 *
 * Called from `main.tsx`, next to where that client is constructed, rather than from a component:
 * nothing here renders, and `App` — the shell every route and every test renders — can't safely
 * call a LaunchDarkly hook, since it mounts with no `LDProvider` in the unit tests and Storybook.
 *
 * The flag is only ever read to turn replay *on*; there is no supported way to remove a Sentry
 * integration once added, so flipping it back off stops new sessions from being flagged but does
 * not un-load replay from ones already running.
 */
export function enableReplayWhenFlagged(client: LDReactClient): void {
	if (!settings) {
		return;
	}

	let loaded = false;
	const checkFlag = () => {
		if (loaded || !client.boolVariation(REPLAY_FLAG_KEY, false)) {
			return;
		}
		loaded = true;
		client.off(`change:${REPLAY_FLAG_KEY}`, checkFlag);
		void loadReplay();
	};

	client.on(`change:${REPLAY_FLAG_KEY}`, checkFlag);
	void client.waitForInitialization().then(checkFlag);
}

// Sentry has to be running before anything it instruments is constructed, and the router is built
// while `router.tsx` is still being evaluated. Initializing here, as a side effect of the module
// that hands out the wrapped factory, makes that ordering a property of the import graph rather
// than something the entry point has to remember to do in the right order.
initializeSentry();

/**
 * `createBrowserRouter`, instrumented so a transaction is named after the route pattern it
 * matched (`/admin/:view?`) rather than the URL a guest happened to be on.
 */
export const createInstrumentedBrowserRouter: typeof createBrowserRouter =
	Sentry.wrapCreateBrowserRouter(createBrowserRouter);

/** Reports a React render error, for `createRoot`'s error callbacks. */
export { reactErrorHandler } from '@sentry/react';
