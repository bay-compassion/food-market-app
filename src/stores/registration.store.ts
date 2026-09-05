import { runInAction } from 'mobx';

import type { GuestFormState } from '../components/types.ts';
import type { GuestRegistrationResult } from '../services/guestVisitApi.ts';
import { makeReactive } from '../services/make-reactive.ts';
import { StorageKey, StorageService } from '../services/storage.service.ts';
import type { GuestStore } from './guest.store.ts';

export type RegistrationSubmitResult =
	| { kind: 'signed-up' }
	| { kind: 'registered'; registration: GuestRegistrationResult }
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

	private readonly storage: Pick<StorageService, 'get' | 'set'> | null;

	constructor(
		private readonly guestStore: GuestStore,
		options: RegistrationStoreOptions = {},
	) {
		this.storage = options.storage === undefined ? new StorageService() : options.storage;
		this.guest = this.prefillGuest();

		return makeReactive(this, { guestStore: false, storage: false });
	}

	/** Applies an edit from the form. An action, so the write is batched and MobX does not warn
	 *  about a mutation reaching an observed observable from outside one. */
	updateGuest(patch: Partial<GuestFormState>): void {
		Object.assign(this.guest, patch);
	}

	/**
	 * Empties every field. The store is prefilled from whatever this device remembers, which is
	 * right for a guest registering themselves and wrong for a worker entering someone else.
	 */
	clear(): void {
		this.guest = {
			firstName: '',
			lastName: '',
			ageRange: '',
			householdSize: '',
			childrenCount: '',
			seniorsCount: '',
			phone: '',
		};
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
		this.isSubmitting = true;
		this.submissionError = false;

		try {
			if (context === 'early') {
				await this.guestStore.signUp({
					firstName: this.guest.firstName,
					lastName: this.guest.lastName,
					phone: this.guest.phone,
					locale,
				});

				return { kind: 'signed-up' };
			}

			const registration = await this.guestStore.register({
				...this.guest,
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

		return {
			firstName: this.guestStore.identity?.firstName ?? '',
			lastName: this.guestStore.identity?.lastName ?? '',
			ageRange: savedHousehold?.ageRange ?? '',
			householdSize: savedHousehold?.householdSize ?? '',
			childrenCount: savedHousehold?.childrenCount ?? '',
			seniorsCount: savedHousehold?.seniorsCount ?? '',
			phone: this.guestStore.identity?.phone ?? '',
		};
	}
}
