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
		it('starts with empty fields when there is no cached identity or household', () => {
			// Arrange & Act
			const store = new RegistrationStore(guestStore, { storage });

			// Assert
			expect(store.guest).toEqual({
				firstName: '',
				lastName: '',
				ageRange: '',
				householdSize: '',
				childrenCount: '',
				seniorsCount: '',
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
