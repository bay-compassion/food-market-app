import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GuestIdentityCard } from '../components/guest-view/identity/GuestIdentityCard';
import { StorageKey } from '../services/storage.service';
import { RootStore } from '../stores/root.store';
import { renderWithApp } from './render-with-app';

const deviceId = 'test-device-token'.padEnd(32, 'x');

function seedIdentity() {
	window.localStorage.setItem(StorageKey.GUEST_DEVICE_TOKEN, JSON.stringify(deviceId));
	window.localStorage.setItem(
		StorageKey.GUEST_IDENTITY,
		JSON.stringify({ firstName: 'Ari', lastName: 'Guest', phone: '555-123-4567' }),
	);
	window.localStorage.setItem(
		StorageKey.GUEST_HOUSEHOLD,
		JSON.stringify({ ageRange: '30-44', householdSize: 3, childrenCount: 1, seniorsCount: 0 }),
	);
}

function notificationFetch(smsConsented = false) {
	return vi.fn().mockImplementation((url: string, options?: RequestInit) => {
		if (url === '/api/sms-subscription' && options?.method === 'DELETE') {
			return Promise.resolve({ ok: true });
		}

		return Promise.resolve({
			ok: true,
			json: () =>
				Promise.resolve(
					url === '/api/notification-status'
						? { pushSubscribed: false, smsConsented }
						: { configured: url === '/api/sms-subscription', publicKey: null },
				),
		});
	});
}

beforeEach(() => {
	window.localStorage.clear();
	seedIdentity();
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('GuestIdentityCard menu', () => {
	it('confirms before forgetting the locally stored identity', async () => {
		// Arrange
		const user = userEvent.setup();

		vi.stubGlobal('fetch', notificationFetch());
		const { store } = renderWithApp(<GuestIdentityCard />);

		await user.click(screen.getByRole('button', { name: 'Open identity menu' }));

		// Act
		await user.click(screen.getByRole('menuitem', { name: 'Forget Information' }));

		// Assert
		expect(screen.getByRole('heading', { name: 'Forget your information?' })).toBeTruthy();
		expect(
			screen.getByText(
				'This removes your saved name, phone number, device ID, and household details from this device. This cannot be undone.',
			),
		).toBeTruthy();
		expect(window.localStorage.getItem(StorageKey.GUEST_DEVICE_TOKEN)).not.toBeNull();

		await user.click(screen.getByRole('button', { name: 'Forget Information' }));
		expect(
			await screen.findByRole('complementary', {
				name: 'Save your information for next time',
			}),
		).toBeTruthy();
		expect(window.localStorage.getItem(StorageKey.GUEST_DEVICE_TOKEN)).toBeNull();
		expect(window.localStorage.getItem(StorageKey.GUEST_IDENTITY)).toBeNull();
		expect(window.localStorage.getItem(StorageKey.GUEST_HOUSEHOLD)).toBeNull();
		// The registration form still on screen (or about to be, on `/signup` or the queue form)
		// must not keep offering the identity or household counts back.
		expect(store.registration.guest).toEqual({
			firstName: '',
			lastName: '',
			ageRange: '',
			householdSize: 1,
			childrenCount: 0,
			seniorsCount: 0,
			phone: '',
		});
	});

	it('opts out of SMS updates', async () => {
		// Arrange
		const user = userEvent.setup();
		const fetchMock = notificationFetch(true);

		vi.stubGlobal('fetch', fetchMock);
		const store = new RootStore();

		await store.guest.loadNotificationSettings();
		renderWithApp(<GuestIdentityCard />, { store });
		await user.click(screen.getByRole('button', { name: 'Open identity menu' }));

		// Act
		await user.click(screen.getByRole('menuitem', { name: 'Opt Out' }));

		// Assert
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith('/api/sms-subscription', {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${deviceId}` },
			}),
		);
		expect(store.guest.smsConsented).toBe(false);
	});
});
