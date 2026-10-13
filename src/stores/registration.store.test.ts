import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StorageKey, StorageService } from '../services/storage.service';
import { GuestStore } from './guest.store';
import { RegistrationStore } from './registration.store';

describe('RegistrationStore', () => {
	let storage: StorageService;
	let guestStore: GuestStore;

	beforeEach(() => {
		storage = new StorageService();
		storage.clear();
		guestStore = new GuestStore({ storage });
	});

	describe('prefilling', () => {
		it('defaults household counts when there is no cached identity or household', () => {
			// Arrange & Act
			const store = new RegistrationStore(guestStore, { storage });

			// Assert
			expect(store.guest).toEqual({
				firstName: '',
				lastName: '',
				pronunciation: '',
				ageRange: '',
				householdSize: 1,
				childrenCount: 0,
				seniorsCount: 0,
				phone: '',
			});
		});

		it('prefills name and phone from the guest store identity', () => {
			// Arrange
			storage.set(StorageKey.GUEST_DEVICE_TOKEN, 'device-token');
			storage.set(StorageKey.GUEST_IDENTITY, {
				firstName: 'Ada',
				lastName: 'Lovelace',
				phone: '555-123-4567',
			});
			const identifiedGuestStore = new GuestStore({ storage });

			// Act
			const store = new RegistrationStore(identifiedGuestStore, { storage });

			// Assert
			expect(store.guest.firstName).toBe('Ada');
			expect(store.guest.lastName).toBe('Lovelace');
			expect(store.guest.phone).toBe('555-123-4567');
		});

		it('prefills household composition from the last-saved household', () => {
			// Arrange
			storage.set(StorageKey.GUEST_HOUSEHOLD, {
				ageRange: '30-44',
				householdSize: 3,
				childrenCount: 1,
				seniorsCount: 0,
			});

			// Act
			const store = new RegistrationStore(guestStore, { storage });

			// Assert
			expect(store.guest.ageRange).toBe('30-44');
			expect(store.guest.householdSize).toBe(3);
			expect(store.guest.childrenCount).toBe(1);
			expect(store.guest.seniorsCount).toBe(0);
		});
	});

	describe('clear', () => {
		it('empties the prefilled fields and any answers', () => {
			// Arrange
			storage.set(StorageKey.GUEST_HOUSEHOLD, { ageRange: '30-44', householdSize: 3 });
			const store = new RegistrationStore(guestStore, { storage });

			store.updateGuest({ firstName: 'Ada' });
			store.setAnswer('q-1', 'by bus');

			// Act
			store.clear();

			// Assert
			expect(store.guest).toEqual({
				firstName: '',
				lastName: '',
				pronunciation: '',
				ageRange: '',
				householdSize: '',
				childrenCount: '',
				seniorsCount: '',
				phone: '',
			});
			expect(store.registrationAnswers).toEqual({});
		});
	});

	describe('resetToDeviceState', () => {
		it('re-derives the form once the device has forgotten its saved identity and household', async () => {
			// Arrange
			storage.set(StorageKey.GUEST_DEVICE_TOKEN, 'device-token');
			storage.set(StorageKey.GUEST_IDENTITY, {
				firstName: 'Ada',
				lastName: 'Lovelace',
				phone: '555-123-4567',
			});
			storage.set(StorageKey.GUEST_HOUSEHOLD, {
				ageRange: '30-44',
				householdSize: 3,
				childrenCount: 1,
				seniorsCount: 0,
			});
			const identifiedGuestStore = new GuestStore({ storage });
			const store = new RegistrationStore(identifiedGuestStore, { storage });

			store.setAnswer('q-1', 'by bus');
			await identifiedGuestStore.forget();

			// Act
			store.resetToDeviceState();

			// Assert
			expect(store.guest).toEqual({
				firstName: '',
				lastName: '',
				pronunciation: '',
				ageRange: '',
				householdSize: 1,
				childrenCount: 0,
				seniorsCount: 0,
				phone: '',
			});
			expect(store.registrationAnswers).toEqual({});
		});
	});

	describe('pronunciation', () => {
		function identifiedRegistration(pronunciation?: string) {
			storage.set(StorageKey.GUEST_DEVICE_TOKEN, 'device-token');
			storage.set(StorageKey.GUEST_IDENTITY, {
				firstName: 'Siobhan',
				lastName: 'Guest',
				phone: '555-123-4567',
				...(pronunciation === undefined ? {} : { pronunciation }),
			});
			const identified = new GuestStore({ storage });
			const signUp = vi.spyOn(identified, 'signUp').mockResolvedValue();

			return { store: new RegistrationStore(identified, { storage }), signUp };
		}

		it('prefills the pronunciation this phone saved', () => {
			// Arrange & Act
			const { store } = identifiedRegistration('shi-VAWN');

			// Assert
			expect(store.guest.pronunciation).toBe('shi-VAWN');
		});

		it('does not send a pronunciation the guest left as it was', async () => {
			// Arrange: a worker may have corrected it since, which this phone never saw.
			const { store, signUp } = identifiedRegistration('shi-VAWN');

			// Act
			await store.submit('early', null, 'en');

			// Assert
			expect(signUp.mock.calls[0]![0].pronunciation).toBeUndefined();
		});

		it('sends a pronunciation the guest changed, trimmed', async () => {
			// Arrange
			const { store, signUp } = identifiedRegistration('shi-VAWN');

			store.updateGuest({ pronunciation: ' shiv-AWN ' });

			// Act
			await store.submit('early', null, 'en');

			// Assert
			expect(signUp.mock.calls[0]![0].pronunciation).toBe('shiv-AWN');
		});

		it('sends an empty pronunciation when the guest cleared it', async () => {
			// Arrange
			const { store, signUp } = identifiedRegistration('shi-VAWN');

			store.updateGuest({ pronunciation: '' });

			// Act
			await store.submit('early', null, 'en');

			// Assert
			expect(signUp.mock.calls[0]![0].pronunciation).toBe('');
		});

		it('stops sending it once the change has been submitted', async () => {
			// Arrange
			const { store, signUp } = identifiedRegistration();

			store.updateGuest({ pronunciation: 'shi-VAWN' });
			await store.submit('early', null, 'en');

			// Act
			await store.submit('early', null, 'en');

			// Assert
			expect(signUp.mock.calls[1]![0].pronunciation).toBeUndefined();
		});
	});

	describe('submit', () => {
		it('registers for the queue and saves the household for next time', async () => {
			// Arrange
			const register = vi
				.spyOn(guestStore, 'register')
				.mockResolvedValue({ id: 'visit-1', status: 'registered', visitToken: 'token-1' });
			const store = new RegistrationStore(guestStore, { storage });

			store.guest = {
				firstName: 'Ada',
				lastName: 'Lovelace',
				pronunciation: '',
				ageRange: '30-44',
				householdSize: 2,
				childrenCount: 0,
				seniorsCount: 0,
				phone: '555-123-4567',
			};
			store.registrationAnswers = { 'q-1': 'text answer' };

			// Act
			const result = await store.submit('queue', 'event-1', 'en');

			// Assert
			expect(register).toHaveBeenCalledWith(
				expect.objectContaining({
					firstName: 'Ada',
					marketEventId: 'event-1',
					answers: { 'q-1': 'text answer' },
					source: 'self',
					locale: 'en',
				}),
			);
			expect(result).toEqual({
				kind: 'registered',
				registration: { id: 'visit-1', status: 'registered', visitToken: 'token-1' },
			});
			expect(storage.get(StorageKey.GUEST_HOUSEHOLD)).toEqual({
				ageRange: '30-44',
				householdSize: 2,
				childrenCount: 0,
				seniorsCount: 0,
			});
			expect(store.isSubmitting).toBe(false);
			expect(store.submissionError).toBe(false);
		});

		it('signs up identity-only for the early context, without touching the saved household', async () => {
			// Arrange
			const signUp = vi.spyOn(guestStore, 'signUp').mockResolvedValue();
			const store = new RegistrationStore(guestStore, { storage });

			store.guest.firstName = 'Ada';
			store.guest.lastName = 'Lovelace';
			store.guest.phone = '555-123-4567';

			// Act
			const result = await store.submit('early', null, 'en');

			// Assert
			expect(signUp).toHaveBeenCalledWith({
				firstName: 'Ada',
				lastName: 'Lovelace',
				phone: '555-123-4567',
				locale: 'en',
			});
			expect(result).toEqual({ kind: 'signed-up' });
			expect(storage.get(StorageKey.GUEST_HOUSEHOLD)).toBeNull();
		});

		it('reports an error and clears isSubmitting when the request fails', async () => {
			// Arrange
			vi.spyOn(guestStore, 'register').mockRejectedValue(new Error('network'));
			const store = new RegistrationStore(guestStore, { storage });

			// Act
			const result = await store.submit('queue', null, 'en');

			// Assert
			expect(result).toEqual({ kind: 'error' });
			expect(store.submissionError).toBe(true);
			expect(store.isSubmitting).toBe(false);
		});
	});
});
