import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import {
	createBrowserRouter,
	createRoutesFromChildren,
	matchRoutes,
	useLocation,
	useNavigationType,
} from 'react-router';

/**
 * Browser-side Sentry, scoped to what the free Developer plan covers: errors, tracing, and
 * error-triggered session replay. See `docs/observability.md` for the quotas each one draws on
 * and for the products deliberately left out.
 *
 * Sentry is inert with no `VITE_SENTRY_DSN` set, which is the case for local development, the
 * unit tests, Storybook, and the end-to-end suite — none of them should be spending quota.
 */

/** A sample rate from the environment, ignoring anything that is not a rate between 0 and 1. */
export function sampleRate(value: string | undefined, fallback: number): number {
	const parsed = Number(value);

	return value !== undefined && value !== '' && parsed >= 0 && parsed <= 1 ? parsed : fallback;
}

export type SentrySettings = {
	dsn: string;
	environment: string;
	tracesSampleRate: number;
	replaysOnErrorSampleRate: number;
};

/** What `Sentry.init` needs, or `null` when the environment has no DSN configured. */
export function sentrySettings(env: ImportMetaEnv): SentrySettings | null {
	const dsn = env.VITE_SENTRY_DSN;

	if (!dsn) {
		return null;
	}

	return {
		dsn,
		environment: env.VITE_SENTRY_ENVIRONMENT ?? env.MODE,
		// A market serves a few hundred guests an hour at most, so a full trace sample still sits
		// far inside the free span allowance. Dial it down here if that stops being true.
		tracesSampleRate: sampleRate(env.VITE_SENTRY_TRACES_SAMPLE_RATE, 1),
		// The free plan includes 50 replays a month, so only sessions that actually hit an error
		// are worth one. Continuous session sampling is off entirely, not merely sampled low.
		replaysOnErrorSampleRate: sampleRate(env.VITE_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE, 1),
	};
}

function initSentry(env: ImportMetaEnv = import.meta.env) {
	const settings = sentrySettings(env);

	if (!settings) {
		return;
	}

	Sentry.init({
		dsn: settings.dsn,
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
		replaysSessionSampleRate: 0,
		replaysOnErrorSampleRate: settings.replaysOnErrorSampleRate,
		// Guests hand this app their name, phone number, and household details. Nothing that
		// identifies one of them belongs in an error report: no IP address, no cookies, no request
		// bodies, and no replay that has not had its text masked.
		sendDefaultPii: false,
	});

	if (settings.replaysOnErrorSampleRate > 0) {
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

// Sentry has to be running before anything it instruments is constructed, and the router is built
// while `router.tsx` is still being evaluated. Initializing here, as a side effect of the module
// that hands out the wrapped factory, makes that ordering a property of the import graph rather
// than something the entry point has to remember to do in the right order.
initSentry();

/**
 * `createBrowserRouter`, instrumented so a transaction is named after the route pattern it
 * matched (`/admin/:view?`) rather than the URL a guest happened to be on.
 */
export const createInstrumentedBrowserRouter: typeof createBrowserRouter =
	Sentry.wrapCreateBrowserRouter(createBrowserRouter);

/** Reports a React render error, for `createRoot`'s error callbacks. */
export { reactErrorHandler } from '@sentry/react';
