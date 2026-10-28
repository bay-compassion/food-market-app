import { runInAction } from 'mobx';

import type { GuestFormState } from '../components/types.ts';
import { HouseholdComposition } from '../models/household-composition.ts';
import type { GuestRegistrationResult } from '../services/guestVisitApi.ts';
import { makeReactive } from '../services/make-reactive.ts';
import { StorageKey, StorageService } from '../services/storage.service.ts';
import type { GuestStore } from './guest.store.ts';
import type { SessionQuestion } from './market-session.store.ts';

export type RegistrationSubmitResult =
	| { kind: 'signed-up' }
	| { kind: 'registered'; registration: GuestRegistrationResult }
	/** The household counts are not valid; the form shows why next to each field. */
	| { kind: 'invalid' }
	| { kind: 'error' };

/**
 * Where the guest stands with the household this phone saved from their last visit:
 * - `none`: nothing was saved, so the guest fills the fields in themselves.
 * - `pending`: shown as a summary, waiting for the guest to say it is still right.
 * - `confirmed`: the guest said it is.
 * - `editing`: the rules no longer accept what was saved, so its fields are open in the form, where
 *   their errors show; fixing them is confirmation enough.
 *
 * Changing a saved household that is fine happens in a draft (`householdDraft`) instead, so the form
 * never shows its fields already filled in and ready.
 */
export type SavedHouseholdReview = 'none' | 'pending' | 'confirmed' | 'editing';

/** The part of the form a saved household covers. */
export type HouseholdFormValues = Pick<
	GuestFormState,
	'ageRange' | 'householdSize' | 'childrenCount' | 'seniorsCount'
>;

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
	/**
	 * Never saved: a household can change between market days, so a guest confirms it on each
	 * visit rather than once for good.
	 */
	savedHouseholdReview: SavedHouseholdReview = 'none';
	/** The guest's changes to the saved household, while they make them; `null` otherwise. */
	householdDraft: HouseholdFormValues | null = null;
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

	/** Whether the guest has said the saved household is still right, or had none to confirm. */
	get isHouseholdConfirmed(): boolean {
		return this.savedHouseholdReview !== 'pending';
	}

	/** The guest says the household saved from their last visit is still right. */
	confirmSavedHousehold(): void {
		this.savedHouseholdReview = 'confirmed';
	}

	/** The guest starts changing the saved household, from what the form holds now. */
	startHouseholdChange(): void {
		const { ageRange, householdSize, childrenCount, seniorsCount } = this.guest;

		this.householdDraft = { ageRange, householdSize, childrenCount, seniorsCount };
	}

	updateHouseholdDraft(patch: Partial<HouseholdFormValues>): void {
		if (this.householdDraft) {
			Object.assign(this.householdDraft, patch);
		}
	}

	/** The draft, checked by the same rules as the form. */
	get householdDraftComposition(): HouseholdComposition | null {
		return this.householdDraft ? new HouseholdComposition(this.householdDraft) : null;
	}

	/** Whether the guest has changed anything in the draft. */
	get isHouseholdDraftDirty(): boolean {
		const draft = this.householdDraft;

		return (
			draft !== null &&
			(Object.keys(draft) as (keyof HouseholdFormValues)[]).some(
				(field) => String(draft[field]) !== String(this.guest[field]),
			)
		);
	}

	/** A draft is worth applying once it differs from the form and is a household the rules accept. */
	get canApplyHouseholdDraft(): boolean {
		return (
			this.isHouseholdDraftDirty &&
			this.householdDraft?.ageRange !== '' &&
			this.householdDraftComposition?.isValid === true
		);
	}

	/** The guest's changes go into the form, and saying so confirms the household. */
	applyHouseholdDraft(): void {
		if (!this.householdDraft || !this.canApplyHouseholdDraft) {
			return;
		}

		Object.assign(this.guest, this.householdDraft);
		this.householdDraft = null;
		this.savedHouseholdReview = 'confirmed';
	}

	/** Drops the draft, leaving the household and whether it was confirmed as they were. */
	cancelHouseholdChange(): void {
		this.householdDraft = null;
	}

	/** Whether the session's every question has an answer, optional ones included. */
	hasAnsweredQuestions(questions: readonly SessionQuestion[]): boolean {
		return questions.every(
			(question) => String(this.registrationAnswers[question.id] ?? '').trim() !== '',
		);
	}

	/**
	 * Whether the guest has done everything the market registration asks — the moment to point
	 * them at the button that actually enters them. A cue, not a gate: the browser and the server
	 * still have the last word, so a phone counts as complete at a US number's ten digits.
	 *
	 * A prefilled form is not a finished one. A returning guest must confirm the household saved
	 * from last time, and answer this week's questions — optional ones too, since the cue is what
	 * tells them to look. Leaving an optional one blank still lets them join.
	 *
	 * Takes the session's questions because they belong to the session, not to this form.
	 */
	isReadyToSubmit(questions: readonly SessionQuestion[]): boolean {
		const { firstName, lastName, phone, ageRange } = this.guest;

		return (
			firstName.trim() !== '' &&
			lastName.trim() !== '' &&
			phone.replace(/\D/g, '').length >= 10 &&
			ageRange !== '' &&
			this.household.isValid &&
			this.isHouseholdConfirmed &&
			this.hasAnsweredQuestions(questions)
		);
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
		this.savedHouseholdReview = 'none';
		this.householdDraft = null;
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

			runInAction(() => {
				this.initialPronunciation = this.guest.pronunciation.trim();
				// What was just saved is next market's to confirm, not this one's to carry over.
				this.savedHouseholdReview = 'pending';
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

		this.initialPronunciation = this.guestStore.identity?.pronunciation ?? '';

		const guest: GuestFormState = {
			firstName: this.guestStore.identity?.firstName ?? '',
			lastName: this.guestStore.identity?.lastName ?? '',
			pronunciation: this.initialPronunciation,
			ageRange: savedHousehold?.ageRange ?? '',
			householdSize: savedHousehold?.householdSize ?? HouseholdComposition.defaults.householdSize,
			childrenCount: savedHousehold?.childrenCount ?? HouseholdComposition.defaults.childrenCount,
			seniorsCount: savedHousehold?.seniorsCount ?? HouseholdComposition.defaults.seniorsCount,
			phone: this.guestStore.identity?.phone ?? '',
		};

		this.householdDraft = null;

		// A saved household the rules no longer accept opens for editing, where its errors show.
		if (!savedHousehold) {
			this.savedHouseholdReview = 'none';
		} else {
			this.savedHouseholdReview = new HouseholdComposition(guest).isValid ? 'pending' : 'editing';
		}

		return guest;
	}
}
