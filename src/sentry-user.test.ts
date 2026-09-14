import { createHash } from 'node:crypto';

import * as Sentry from '@sentry/react';
import { observable, runInAction } from 'mobx';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SentryUserReporter } from './sentry-user';

vi.mock('@sentry/react', () => ({ setUser: vi.fn() }));

/** The digest the server stores in `guests.device_token_hash`, computed the way it does. */
function serverHash(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

describe('SentryUserReporter', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('identifies an unrecognised device as nobody', () => {
		// Arrange
		const guest = observable({ deviceId: null, displayedName: null });

		// Act
		using _reporter = new SentryUserReporter(guest);

		// Assert
		expect(Sentry.setUser).toHaveBeenLastCalledWith(null);
	});

	it('identifies a guest by the hash of their device token, never the token itself', async () => {
		// Arrange
		const guest = observable({
			deviceId: 'device-token',
			displayedName: 'Ari G',
		});

		// Act
		using _reporter = new SentryUserReporter(guest);

		// Assert
		await vi.waitFor(() =>
			expect(Sentry.setUser).toHaveBeenLastCalledWith({
				id: serverHash('device-token'),
				username: 'Ari G',
			}),
		);
	});

	it('follows the guest when they register mid-session', async () => {
		// Arrange
		const guest = observable<{
			deviceId: string | null;
			displayedName: string | null;
		}>({
			deviceId: null,
			displayedName: null,
		});

		using _reporter = new SentryUserReporter(guest);

		// Act
		runInAction(() => {
			guest.deviceId = 'new-token';
			guest.displayedName = 'Ari G';
		});

		// Assert
		await vi.waitFor(() =>
			expect(Sentry.setUser).toHaveBeenLastCalledWith({
				id: serverHash('new-token'),
				username: 'Ari G',
			}),
		);
	});

	it('drops a digest that resolves after the guest forgot the device', async () => {
		// Arrange
		const guest = observable<{
			deviceId: string | null;
			displayedName: string | null;
		}>({
			deviceId: 'old-token',
			displayedName: 'Ari G',
		});

		using _reporter = new SentryUserReporter(guest);

		// Act
		runInAction(() => {
			guest.deviceId = null;
			guest.displayedName = null;
		});
		await new Promise((resolve) => setTimeout(resolve, 10));

		// Assert
		expect(Sentry.setUser).toHaveBeenCalledTimes(1);
		expect(Sentry.setUser).toHaveBeenLastCalledWith(null);
	});

	it('stops naming anyone once disposed', () => {
		// Arrange
		const guest = observable({ deviceId: null, displayedName: null });
		const reporter = new SentryUserReporter(guest);

		// Act
		reporter[Symbol.dispose]();

		// Assert
		expect(Sentry.setUser).toHaveBeenLastCalledWith(null);
	});
});
