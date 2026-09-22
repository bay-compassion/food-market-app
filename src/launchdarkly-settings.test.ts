import { describe, expect, it } from 'vitest';

import { launchDarklySettings } from './launchdarkly-settings';

describe('launchDarklySettings', () => {
	it('is configured when a client ID is set', () => {
		// Arrange
		const env = { VITE_LAUNCHDARKLY_CLIENT_ID: 'client-id' };

		// Act
		const settings = launchDarklySettings(env);

		// Assert
		expect(settings).toEqual({ status: 'configured', clientSideId: 'client-id' });
	});

	// FOOD-MARKET-C/D: a production build with no client ID crashed on the first flag-reading
	// screen. A missing ID must be reported as missing, never quietly treated as "no flags".
	it('is missing when nothing is set', () => {
		// Arrange
		const env = {};

		// Act
		const settings = launchDarklySettings(env);

		// Assert
		expect(settings).toEqual({ status: 'missing' });
	});

	it('is missing when the client ID is empty', () => {
		// Arrange
		const env = { VITE_LAUNCHDARKLY_CLIENT_ID: '' };

		// Act
		const settings = launchDarklySettings(env);

		// Assert
		expect(settings).toEqual({ status: 'missing' });
	});

	it('is disabled only when explicitly opted out', () => {
		// Arrange
		const env = { VITE_LAUNCHDARKLY_CLIENT_ID: 'client-id', VITE_LAUNCHDARKLY_DISABLED: 'true' };

		// Act
		const settings = launchDarklySettings(env);

		// Assert
		expect(settings).toEqual({ status: 'disabled' });
	});
});
