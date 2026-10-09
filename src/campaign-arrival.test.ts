import { afterEach, describe, expect, it } from 'vitest';

import { takeArrivalAttribution } from './campaign-arrival';

describe('takeArrivalAttribution', () => {
	afterEach(() => {
		window.history.replaceState(null, '', '/');
	});

	it('returns the attribution and leaves the rest of the URL in place', () => {
		// Arrange
		window.history.replaceState(
			null,
			'',
			'/claim?lang=es&utm_source=printed_card&utm_medium=offline#top',
		);

		// Act
		const attribution = takeArrivalAttribution();

		// Assert
		expect(attribution?.tags).toEqual({ utm_source: 'printed_card', utm_medium: 'offline' });
		expect(window.location.pathname + window.location.search + window.location.hash).toBe(
			'/claim?lang=es#top',
		);
	});

	it('removes a UTM parameter even when its value is rejected', () => {
		// Arrange
		window.history.replaceState(null, '', '/?utm_source=555-123-4567%20x');

		// Act
		const attribution = takeArrivalAttribution();

		// Assert
		expect(attribution).toBeNull();
		expect(window.location.search).toBe('');
	});
});
