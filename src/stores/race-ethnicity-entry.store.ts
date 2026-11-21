import {
	RaceEthnicity,
	type RaceEthnicityAnswer,
	type RaceEthnicityCode,
} from '../models/race-ethnicity.ts';
import { makeReactive } from '../services/make-reactive.ts';
import type { GuestStore } from './guest.store.ts';

/**
 * The race and ethnicity question while a guest answers it. Asked only until the guest's record
 * holds an answer — this phone keeps that fact, never the answer itself — so a returning guest is
 * not asked again at every market, nor shown how they answered on a screen others can see.
 */
export class RaceEthnicityEntryStore {
	value: RaceEthnicity = RaceEthnicity.empty;

	constructor(private readonly guestStore: Pick<GuestStore, 'identity'>) {
		return makeReactive(this, { guestStore: false });
	}

	/** Whether the question is still asked of this phone's guest. */
	get isAsked(): boolean {
		return this.guestStore.identity?.raceEthnicityAnswered !== true;
	}

	/**
	 * Whether the question is done with, for the cue that points at "Join". Optional, but counted
	 * like the session's optional questions, since the cue is what tells a guest to look;
	 * "Prefer not to answer" is always there, so no one is held up by it.
	 */
	get isSettled(): boolean {
		return !this.isAsked || (this.value.isAnswered && this.value.isValid);
	}

	/** What to send: only an answer the guest gave while asked. */
	get answer(): RaceEthnicityAnswer | undefined {
		return this.isAsked && this.value.isAnswered ? this.value.answer : undefined;
	}

	toggle(code: RaceEthnicityCode): void {
		this.value = this.value.toggle(code);
	}

	setOtherText(text: string): void {
		this.value = this.value.withOtherText(text);
	}

	reset(): void {
		this.value = RaceEthnicity.empty;
	}
}
