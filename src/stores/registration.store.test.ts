import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StorageKey, StorageService } from '../services/storage.service';
import { GuestStore } from './guest.store';
import type { SessionQuestion } from './market-session.store';
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

		it('asks a guest with a saved household to confirm it, and one without to fill it in', () => {
			// Arrange
			const fresh = new RegistrationStore(guestStore, { storage });

			storage.set(StorageKey.GUEST_HOUSEHOLD, {
				ageRange: '30-44',
				householdSize: 3,
				childrenCount: 1,
				seniorsCount: 0,
			});

			// Act
			const returning = new RegistrationStore(guestStore, { storage });

			// Assert
			expect(fresh.savedHouseholdReview).toBe('none');
			expect(returning.savedHouseholdReview).toBe('pending');
		});

		it('opens a saved household the rules no longer accept for editing', () => {
			// Arrange
			storage.set(StorageKey.GUEST_HOUSEHOLD, {
				ageRange: '30-44',
				householdSize: 1,
				childrenCount: 1,
				seniorsCount: 0,
			});

			// Act
			const store = new RegistrationStore(guestStore, { storage });

			// Assert
			expect(store.savedHouseholdReview).toBe('editing');
		});
	});

	describe('clear', () => {
		it('empties the prefilled fields and any answers, keeping the default household', () => {
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
				householdSize: 1,
				childrenCount: 0,
				seniorsCount: 0,
				phone: '',
			});
			expect(store.registrationAnswers).toEqual({});
			expect(store.savedHouseholdReview).toBe('none');
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

	describe('isReadyToSubmit', () => {
		const complete = {
			firstName: 'Ada',
			lastName: 'Lovelace',
			pronunciation: '',
			ageRange: '30-44' as const,
			householdSize: 2,
			childrenCount: 0,
			seniorsCount: 0,
			phone: '(555) 123-4567',
		};
		const requiredQuestion: SessionQuestion = {
			id: 'q-1',
			prompt: 'How did you hear?',
			type: 'text',
			required: true,
		};
		const optionalQuestion: SessionQuestion = {
			id: 'q-2',
			prompt: 'Anything else?',
			type: 'text',
			required: false,
		};

		it('is ready once every field is filled in and every question answered', () => {
			// Arrange
			const store = new RegistrationStore(guestStore, { storage });

			store.guest = { ...complete };
			store.setAnswer('q-2', 'No');

			// Act
			const ready = store.isReadyToSubmit([optionalQuestion]);

			// Assert
			expect(ready).toBe(true);
		});

		it('waits for an answer to an optional question too', () => {
			// Arrange
			const store = new RegistrationStore(guestStore, { storage });

			store.guest = { ...complete };

			// Act
			const ready = store.isReadyToSubmit([optionalQuestion]);

			// Assert
			expect(ready).toBe(false);
		});

		it('waits for a returning guest to confirm the household saved from last time', () => {
			// Arrange
			storage.set(StorageKey.GUEST_HOUSEHOLD, {
				ageRange: '30-44',
				householdSize: 2,
				childrenCount: 0,
				seniorsCount: 0,
			});
			const store = new RegistrationStore(guestStore, { storage });

			store.updateGuest({ firstName: 'Ada', lastName: 'Lovelace', phone: '(555) 123-4567' });

			// Act
			const before = store.isReadyToSubmit([]);

			store.confirmSavedHousehold();
			const after = store.isReadyToSubmit([]);

			// Assert
			expect(before).toBe(false);
			expect(after).toBe(true);
		});

		it.each([
			['a blank first name', { firstName: '  ' }],
			['a blank last name', { lastName: '' }],
			['a phone short of ten digits', { phone: '(555) 123-456' }],
			['no age range', { ageRange: '' as const }],
			['a household with no adult', { householdSize: 1, childrenCount: 1 }],
		])('is not ready with %s', (_, patch) => {
			// Arrange
			const store = new RegistrationStore(guestStore, { storage });

			store.guest = { ...complete, ...patch };

			// Act
			const ready = store.isReadyToSubmit([]);

			// Assert
			expect(ready).toBe(false);
		});

		it('waits for an answer to a required question, ignoring whitespace', () => {
			// Arrange
			const store = new RegistrationStore(guestStore, { storage });

			store.guest = { ...complete };
			store.setAnswer('q-1', '   ');

			// Act
			const before = store.isReadyToSubmit([requiredQuestion]);

			store.setAnswer('q-1', 'A flyer');
			const after = store.isReadyToSubmit([requiredQuestion]);

			// Assert
			expect(before).toBe(false);
			expect(after).toBe(true);
		});
	});

	describe('changing the saved household', () => {
		const savedHousehold = {
			ageRange: '30-44',
			householdSize: 2,
			childrenCount: 0,
			seniorsCount: 0,
		};

		beforeEach(() => {
			storage.set(StorageKey.GUEST_HOUSEHOLD, savedHousehold);
		});

		it('starts a draft from the form without touching the form or confirming it', () => {
			// Arrange
			const store = new RegistrationStore(guestStore, { storage });

			// Act
			store.startHouseholdChange();
			store.updateHouseholdDraft({ householdSize: 4 });

			// Assert
			expect(store.householdDraft).toEqual({ ...savedHousehold, householdSize: 4 });
			expect(store.guest.householdSize).toBe(2);
			expect(store.savedHouseholdReview).toBe('pending');
		});

		it('cannot apply a draft until something in it changes', () => {
			// Arrange
			const store = new RegistrationStore(guestStore, { storage });

			store.startHouseholdChange();

			// Act
			const before = store.canApplyHouseholdDraft;

			store.updateHouseholdDraft({ childrenCount: 1 });
			const after = store.canApplyHouseholdDraft;

			// Assert
			expect(before).toBe(false);
			expect(after).toBe(true);
		});

		it('cannot apply a changed draft the rules do not accept', () => {
			// Arrange
			const store = new RegistrationStore(guestStore, { storage });

			store.startHouseholdChange();

			// Act
			store.updateHouseholdDraft({ childrenCount: 2 });

			// Assert
			expect(store.isHouseholdDraftDirty).toBe(true);
			expect(store.canApplyHouseholdDraft).toBe(false);
		});

		it('puts an applied draft in the form and confirms the household', () => {
			// Arrange
			const store = new RegistrationStore(guestStore, { storage });

			store.startHouseholdChange();
			store.updateHouseholdDraft({ householdSize: 4, seniorsCount: 1 });

			// Act
			store.applyHouseholdDraft();

			// Assert
			expect(store.guest).toMatchObject({ householdSize: 4, seniorsCount: 1 });
			expect(store.householdDraft).toBeNull();
			expect(store.savedHouseholdReview).toBe('confirmed');
		});

		it('drops a cancelled draft, leaving the household still to confirm', () => {
			// Arrange
			const store = new RegistrationStore(guestStore, { storage });

			store.startHouseholdChange();
			store.updateHouseholdDraft({ householdSize: 4 });

			// Act
			store.cancelHouseholdChange();

			// Assert
			expect(store.householdDraft).toBeNull();
			expect(store.guest.householdSize).toBe(2);
			expect(store.savedHouseholdReview).toBe('pending');
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
			// Saved for next time, and so next time's to confirm.
			expect(store.savedHouseholdReview).toBe('pending');
			expect(store.isSubmitting).toBe(false);
			expect(store.submissionError).toBe(false);
		});

		it('refuses to register a household that its children and seniors outnumber', async () => {
			// Arrange
			const register = vi.spyOn(guestStore, 'register');
			const store = new RegistrationStore(guestStore, { storage });

			store.updateGuest({ householdSize: 1, childrenCount: 1, seniorsCount: 1 });

			// Act
			const result = await store.submit('queue', 'event-1', 'en');

			// Assert
			expect(result).toEqual({ kind: 'invalid' });
			expect(store.household.issues).toEqual({ householdSize: 'exceeds-household' });
			expect(register).not.toHaveBeenCalled();
		});

		it('signs up early even when the household counts left on this device are invalid', async () => {
			// Arrange
			const signUp = vi.spyOn(guestStore, 'signUp').mockResolvedValue();
			const store = new RegistrationStore(guestStore, { storage });

			store.updateGuest({ householdSize: 1.5 });

			// Act
			const result = await store.submit('early', null, 'en');

			// Assert
			expect(result).toEqual({ kind: 'signed-up' });
			expect(signUp).toHaveBeenCalledOnce();
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
