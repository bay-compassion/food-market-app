import { runInAction } from 'mobx';

import type { GuestFormState } from '../components/types.ts';
import { HouseholdComposition } from '../models/household-composition.ts';
import type { GuestRegistrationResult } from '../services/guestVisitApi.ts';
import { makeReactive } from '../services/make-reactive.ts';
import { StorageKey, StorageService } from '../services/storage.service.ts';
import type { GuestStore } from './guest.store.ts';

export type RegistrationSubmitResult =
	| { kind: 'signed-up' }
	| { kind: 'registered'; registration: GuestRegistrationResult }
	/** The household counts are not valid; the form shows why next to each field. */
	| { kind: 'invalid' }
	| { kind: 'error' };

export type RegistrationStoreOptions = {
	storage?: Pick<StorageService, 'get' | 'set'> | null;
};

/**
 * Owns the guest registration form's in-progress state: the fields, the lottery answers, and the
 * submission itself. The market-registration and identity-signup forms both use this store instead
 * of wiring up separate copies of the same field state.
 */
export class RegistrationStore {
	guest: GuestFormState;
	registrationAnswers: Record<string, string | number> = {};
	isSubmitting = false;
	submissionError = false;
	/** The pronunciation the form started from, to tell whether the guest changed it. */
	private initialPronunciation = '';

	private readonly storage: Pick<StorageService, 'get' | 'set'> | null;

	constructor(
		private readonly guestStore: GuestStore,
		options: RegistrationStoreOptions = {},
	) {
		this.storage = options.storage === undefined ? new StorageService() : options.storage;
		this.guest = this.prefillGuest();

		return makeReactive(this, { guestStore: false, storage: false });
	}

	/**
	 * The pronunciation to send: only one the guest changed here. A worker may have corrected it
	 * since this phone saved it, and this phone never reads that back, so resending the saved one
	 * unchanged would quietly undo the correction.
	 */
	get pronunciationChange(): string | undefined {
		const pronunciation = this.guest.pronunciation.trim();

		return pronunciation === this.initialPronunciation ? undefined : pronunciation;
	}

	/** Who the guest is shopping for, checked by the same rules the server applies. */
	get household(): HouseholdComposition {
		return new HouseholdComposition(this.guest);
	}

	/** Applies an edit from the form. An action, so the write is batched and MobX does not warn
	 *  about a mutation reaching an observed observable from outside one. */
	updateGuest(patch: Partial<GuestFormState>): void {
		Object.assign(this.guest, patch);
	}

	/**
	 * Empties every field and puts the household counts back to their defaults. The store is
	 * prefilled from whatever this device remembers, which is right for a guest registering
	 * themselves and wrong for a worker entering someone else.
	 */
	clear(): void {
		this.guest = {
			firstName: '',
			lastName: '',
			pronunciation: '',
			ageRange: '',
			...HouseholdComposition.defaults,
			phone: '',
		};
		this.registrationAnswers = {};
		this.initialPronunciation = '';
	}

	/**
	 * Re-derives the form from this device's current state — blank identity fields and the default
	 * household counts, the same as a device that has never saved anything. Called after
	 * `GuestStore.forget()`, so a form still on screen does not keep showing what the guest just
	 * asked to forget.
	 */
	resetToDeviceState(): void {
		this.guest = this.prefillGuest();
		this.registrationAnswers = {};
	}

	/** The answer to one of the session's configured registration questions. */
	setAnswer(questionId: string, value: string | number): void {
		this.registrationAnswers[questionId] = value;
	}

	/** The flow decides whether this creates a market visit or saves identity only. */
	async submit(
		context: 'queue' | 'early',
		marketEventId: string | null,
		locale: string,
	): Promise<RegistrationSubmitResult> {
		// Signing up early collects no household, so counts left over on this device must not block it.
		if (context === 'queue' && !this.household.isValid) {
			return { kind: 'invalid' };
		}

		this.isSubmitting = true;
		this.submissionError = false;

		try {
			if (context === 'early') {
				await this.guestStore.signUp({
					firstName: this.guest.firstName,
					lastName: this.guest.lastName,
					phone: this.guest.phone,
					pronunciation: this.pronunciationChange,
					locale,
				});

				runInAction(() => (this.initialPronunciation = this.guest.pronunciation.trim()));

				return { kind: 'signed-up' };
			}

			const registration = await this.guestStore.register({
				...this.guest,
				pronunciation: this.pronunciationChange,
				locale,
				marketEventId,
				answers: this.registrationAnswers,
				source: 'self',
			});

			// Kept only to prefill the lottery-entry fields next time — never sent as part of identity.
			this.storage?.set(StorageKey.GUEST_HOUSEHOLD, {
				ageRange: this.guest.ageRange,
				householdSize: this.guest.householdSize,
				childrenCount: this.guest.childrenCount,
				seniorsCount: this.guest.seniorsCount,
			});

			runInAction(() => (this.initialPronunciation = this.guest.pronunciation.trim()));

			return { kind: 'registered', registration };
		} catch {
			runInAction(() => (this.submissionError = true));

			return { kind: 'error' };
		} finally {
			runInAction(() => (this.isSubmitting = false));
		}
	}

	private prefillGuest(): GuestFormState {
		const savedHousehold = this.storage?.get(StorageKey.GUEST_HOUSEHOLD) as Partial<
			Pick<GuestFormState, 'ageRange' | 'householdSize' | 'childrenCount' | 'seniorsCount'>
		> | null;

		this.initialPronunciation = this.guestStore.identity?.pronunciation ?? '';

		return {
			firstName: this.guestStore.identity?.firstName ?? '',
			lastName: this.guestStore.identity?.lastName ?? '',
			pronunciation: this.initialPronunciation,
			ageRange: savedHousehold?.ageRange ?? '',
			householdSize: savedHousehold?.householdSize ?? HouseholdComposition.defaults.householdSize,
			childrenCount: savedHousehold?.childrenCount ?? HouseholdComposition.defaults.childrenCount,
			seniorsCount: savedHousehold?.seniorsCount ?? HouseholdComposition.defaults.seniorsCount,
			phone: this.guestStore.identity?.phone ?? '',
		};
	}
}
