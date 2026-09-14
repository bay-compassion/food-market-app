import { describe, expect, it } from 'vitest';

import { sampleRate, sentrySettings } from './sentry-settings';

/**
 * `import.meta.env` as the app sees it, with only the keys a test cares about set. Every Sentry key
 * is cleared first, because Vitest loads a developer's local `.env` into `import.meta.env` too.
 */
function env(overrides: Partial<ImportMetaEnv> = {}): ImportMetaEnv {
	return {
		...import.meta.env,
		VITE_SENTRY_DSN: undefined,
		VITE_SENTRY_ENABLED: undefined,
		VITE_SENTRY_ENVIRONMENT: undefined,
		VITE_SENTRY_FEEDBACK_ENABLED: undefined,
		VITE_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE: undefined,
		VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE: undefined,
		VITE_SENTRY_TRACES_SAMPLE_RATE: undefined,
		VITE_SENTRY_USER_INFO_ENABLED: undefined,
		MODE: 'test',
		...overrides,
	};
}

describe('sampleRate', () => {
	it.each([
		['0', 0],
		['0.25', 0.25],
		['1', 1],
	])('reads %s as a rate', (value, expected) => {
		// Arrange, Act
		const rate = sampleRate(value, 0.5);

		// Assert
		expect(rate).toBe(expected);
	});

	it.each([undefined, '', 'all', '-0.1', '2', 'NaN'])(
		'falls back when the environment says %s',
		(value) => {
			// Arrange, Act
			const rate = sampleRate(value, 0.5);

			// Assert
			expect(rate).toBe(0.5);
		},
	);
});

describe('sentrySettings', () => {
	it('reports nothing to configure without a DSN', () => {
		// Arrange
		const environment = env();

		// Act
		const settings = sentrySettings(environment);

		// Assert
		expect(settings).toBeNull();
	});

	it('samples every trace and every errored session by default', () => {
		// Arrange
		const environment = env({
			VITE_SENTRY_DSN: 'https://key@o0.ingest.us.sentry.io/1',
		});

		// Act
		const settings = sentrySettings(environment);

		// Assert
		expect(settings).toEqual({
			dsn: 'https://key@o0.ingest.us.sentry.io/1',
			enabled: true,
			environment: 'test',
			tracesSampleRate: 1,
			replaysSessionSampleRate: 0,
			replaysOnErrorSampleRate: 1,
			feedbackEnabled: false,
			userInfoEnabled: false,
		});
	});

	it.each([
		['true', undefined, true],
		['true', 'false', false],
		['1', undefined, false],
		[undefined, undefined, false],
	])(
		'offers feedback when VITE_SENTRY_FEEDBACK_ENABLED is %s and VITE_SENTRY_ENABLED is %s: %s',
		(feedback, sentry, expected) => {
			// Arrange
			const environment = env({
				VITE_SENTRY_DSN: 'https://key@o0.ingest.us.sentry.io/1',
				VITE_SENTRY_ENABLED: sentry,
				VITE_SENTRY_FEEDBACK_ENABLED: feedback,
			});

			// Act
			const settings = sentrySettings(environment);

			// Assert
			expect(settings?.feedbackEnabled).toBe(expected);
		},
	);

	it.each([
		['true', undefined, true],
		['true', 'false', false],
		['1', undefined, false],
		[undefined, undefined, false],
	])(
		'identifies guests when VITE_SENTRY_USER_INFO_ENABLED is %s and VITE_SENTRY_ENABLED is %s: %s',
		(userInfo, sentry, expected) => {
			// Arrange
			const environment = env({
				VITE_SENTRY_DSN: 'https://key@o0.ingest.us.sentry.io/1',
				VITE_SENTRY_ENABLED: sentry,
				VITE_SENTRY_USER_INFO_ENABLED: userInfo,
			});

			// Act
			const settings = sentrySettings(environment);

			// Assert
			expect(settings?.userInfoEnabled).toBe(expected);
		},
	);

	it('takes sample rates and an environment name from the environment', () => {
		// Arrange
		const environment = env({
			VITE_SENTRY_DSN: 'https://key@o0.ingest.us.sentry.io/1',
			VITE_SENTRY_ENVIRONMENT: 'deploy-preview',
			VITE_SENTRY_TRACES_SAMPLE_RATE: '0.2',
			VITE_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE: '0',
		});

		// Act
		const settings = sentrySettings(environment);

		// Assert
		expect(settings).toMatchObject({
			environment: 'deploy-preview',
			tracesSampleRate: 0.2,
			replaysOnErrorSampleRate: 0,
		});
	});
});
