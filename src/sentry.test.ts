import { describe, expect, it } from 'vitest';

import { sampleRate, sentrySettings } from './sentry';

/** `import.meta.env` as the app sees it, with only the keys a test cares about set. */
function env(overrides: Partial<ImportMetaEnv> = {}): ImportMetaEnv {
	return { ...import.meta.env, VITE_SENTRY_DSN: undefined, MODE: 'test', ...overrides };
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
		const environment = env({ VITE_SENTRY_DSN: 'https://key@o0.ingest.us.sentry.io/1' });

		// Act
		const settings = sentrySettings(environment);

		// Assert
		expect(settings).toEqual({
			dsn: 'https://key@o0.ingest.us.sentry.io/1',
			environment: 'test',
			tracesSampleRate: 1,
			replaysOnErrorSampleRate: 1,
		});
	});

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
