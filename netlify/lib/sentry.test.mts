import { describe, expect, it } from 'vitest';

import { sampleRate, sentrySettings } from './sentry.mjs';

const dsn = 'https://key@o0.ingest.us.sentry.io/1';

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
		const env = { CONTEXT: 'production' };

		// Act
		const settings = sentrySettings(env);

		// Assert
		expect(settings).toBeNull();
	});

	it("names the environment after Netlify's deploy context and the release after its commit", () => {
		// Arrange
		const env = { SENTRY_DSN: dsn, CONTEXT: 'deploy-preview', COMMIT_REF: 'abc123' };

		// Act
		const settings = sentrySettings(env);

		// Assert
		expect(settings).toEqual({
			dsn,
			environment: 'deploy-preview',
			release: 'abc123',
			tracesSampleRate: 1,
		});
	});

	it('falls back to a development environment and no release off Netlify', () => {
		// Arrange
		const env = { SENTRY_DSN: dsn };

		// Act
		const settings = sentrySettings(env);

		// Assert
		expect(settings).toMatchObject({ environment: 'development', release: undefined });
	});

	it('lets the environment override the deploy context and the trace sample rate', () => {
		// Arrange
		const env = {
			SENTRY_DSN: dsn,
			CONTEXT: 'production',
			SENTRY_ENVIRONMENT: 'staging',
			SENTRY_TRACES_SAMPLE_RATE: '0.1',
		};

		// Act
		const settings = sentrySettings(env);

		// Assert
		expect(settings).toMatchObject({ environment: 'staging', tracesSampleRate: 0.1 });
	});
});
