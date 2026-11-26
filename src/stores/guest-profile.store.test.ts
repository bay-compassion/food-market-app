import { describe, expect, it, vi } from 'vitest';

import { adminTranslations } from '../adminLocales.ts';
import type { GuestProfileRecord } from '../models/guest-profile.ts';
import { AdminRequestError } from '../services/admin-api.ts';
import { GuestProfileStore, type GuestProfileApi } from './guest-profile.store.ts';
import { NotificationStore } from './notification.store.ts';

function record(guestId: string): GuestProfileRecord {
	return {
		guestId,
		firstName: 'Maria',
		lastName: 'Lopez',
		pronunciation: null,
		phone: '(415) 555-0142',
		locale: 'es',
		createdAt: '2025-03-12T17:00:00.000Z',
		visits: [],
	};
}

function setup(getGuestProfile: GuestProfileApi['getGuestProfile']) {
	const notifications = new NotificationStore();
	const error = vi.spyOn(notifications, 'error');
	const store = new GuestProfileStore({ getGuestProfile }, notifications);

	return { store, error };
}

describe('GuestProfileStore', () => {
	it('loads the guest the route names', async () => {
		// Arrange
		const { store } = setup(async (guestId) => record(guestId));

		// Act
		await store.load('guest-1');

		// Assert
		expect(store.profile?.guestId).toBe('guest-1');
		expect(store.loadFailed).toBe(false);
	});

	it('keeps the profile on screen while it reloads the same guest', async () => {
		// Arrange
		let resolve: (value: GuestProfileRecord) => void = () => {};
		const getGuestProfile = vi
			.fn<GuestProfileApi['getGuestProfile']>()
			.mockResolvedValueOnce(record('guest-1'))
			.mockImplementationOnce(() => new Promise((done) => (resolve = done)));
		const { store } = setup(getGuestProfile);

		await store.load('guest-1');

		// Act
		const reload = store.load('guest-1');

		// Assert
		expect(store.profile?.guestId).toBe('guest-1');
		resolve(record('guest-1'));
		await reload;
	});

	it('drops a profile that arrives after the guest was closed', async () => {
		// Arrange
		let resolve: (value: GuestProfileRecord) => void = () => {};
		const { store } = setup(() => new Promise((done) => (resolve = done)));
		const load = store.load('guest-1');

		// Act
		store.close();
		resolve(record('guest-1'));
		await load;

		// Assert
		expect(store.profile).toBeNull();
	});

	it('says why it could not load, with the server’s reason when it gave one', async () => {
		// Arrange
		const { store, error } = setup(async () => {
			throw new AdminRequestError('guest_profile', 'Guest not found.');
		});

		// Act
		await store.load('missing');

		// Assert
		expect(store.loadFailed).toBe(true);
		expect(error).toHaveBeenCalledWith('Guest not found.');
	});

	it('falls back to its own words when the server gave no reason', async () => {
		// Arrange
		const { store, error } = setup(async () => {
			throw new Error('network');
		});

		// Act
		await store.load('guest-1');

		// Assert
		expect(error).toHaveBeenCalledWith(adminTranslations.en.guestProfile.loadFailed);
	});
});
