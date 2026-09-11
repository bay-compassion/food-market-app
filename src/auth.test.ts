import type { AppState } from '@auth0/auth0-react';
import { describe, expect, it } from 'vitest';

import { returnToPath } from './auth.ts';

describe('returnToPath', () => {
	it('returns the in-app path the sign-in started from', () => {
		// Arrange
		const appState = { returnTo: '/admin/queue?tab=waiting' };

		// Act
		const destination = returnToPath(appState);

		// Assert
		expect(destination).toBe('/admin/queue?tab=waiting');
	});

	it('falls back to the guest view when no destination was recorded', () => {
		// Arrange

		// Act & Assert
		expect(returnToPath()).toBe('/');
		expect(returnToPath({})).toBe('/');
	});

	it('refuses a destination that leaves this app', () => {
		// Arrange
		// `appState` round-trips through session storage, so an off-site value must not be followed.
		const offSite = ['https://example.test/admin', '//example.test/admin', 'admin'];

		// Act
		const destinations = offSite.map((returnTo) => returnToPath({ returnTo }));

		// Assert
		expect(destinations).toEqual(['/', '/', '/']);
	});

	it('ignores a destination that is not a string', () => {
		// Arrange
		// `AppState` declares `returnTo` as a string, but the value is deserialized from session
		// storage rather than constructed here, so the cast is what the runtime actually hands over.
		const appState = { returnTo: { pathname: '/admin' } } as unknown as AppState;

		// Act
		const destination = returnToPath(appState);

		// Assert
		expect(destination).toBe('/');
	});
});
