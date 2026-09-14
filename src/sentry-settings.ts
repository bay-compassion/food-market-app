import type * as Sentry from '@sentry/react';

/**
 * Browser Sentry configuration read from the build environment, kept apart from `sentry.ts` because
 * importing that module starts Sentry. A component that only needs to know what this build has
 * turned on can import this one without pulling `Sentry.init` into Storybook or the unit tests.
 */

/** A sample rate from the environment, ignoring anything that is not a rate between 0 and 1. */
export function sampleRate(value: string | undefined, fallback: number): number {
	const parsed = Number(value);

	return value !== undefined && value !== '' && parsed >= 0 && parsed <= 1 ? parsed : fallback;
}

export type SentrySettings = Required<
	Pick<
		Sentry.BrowserOptions,
		| 'enabled'
		| 'dsn'
		| 'environment'
		| 'tracesSampleRate'
		| 'replaysSessionSampleRate'
		| 'replaysOnErrorSampleRate'
	>
> & {
	/** Whether the app bar offers the user feedback form. */
	feedbackEnabled: boolean;
};

/** What `Sentry.init` needs, or `null` when the environment has no DSN configured. */
export function sentrySettings(env: ImportMetaEnv): SentrySettings | null {
	const dsn = env.VITE_SENTRY_DSN;

	if (!dsn) {
		return null;
	}

	const enabled = env.VITE_SENTRY_ENABLED !== 'false';

	return {
		dsn,
		enabled,
		environment: env.VITE_SENTRY_ENVIRONMENT ?? env.MODE,

		// A market serves a few hundred guests an hour at most, so a full trace sample still sits
		// far inside the free span allowance. Dial it down here if that stops being true.
		tracesSampleRate: sampleRate(env.VITE_SENTRY_TRACES_SAMPLE_RATE, 1),
		// The free plan includes 50 replays a month, so only sessions that actually hit an error
		// are worth one. Continuous session sampling is off entirely, not merely sampled low.
		replaysSessionSampleRate: sampleRate(env.VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE, 0),
		replaysOnErrorSampleRate: sampleRate(env.VITE_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE, 1),
		// Feedback is for beta testing, so it is opt-in: a build that says nothing about it, which is
		// what a stable release should be, never shows the form.
		feedbackEnabled: enabled && env.VITE_SENTRY_FEEDBACK_ENABLED === 'true',
	};
}
