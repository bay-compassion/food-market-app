import { makeAutoObservable, runInAction } from 'mobx';

import type { PremarketCodeStatus } from '../services/premarket.ts';
import type { GuestStore } from './guest.store.ts';
import type { RegistrationStore } from './registration.store.ts';
import type { VisitStore } from './visit.store.ts';

type PremarketEntryOptions = {
	/** The code read from the scanned address, or `null` when it carried none. */
	code: string | null;
	registration: Pick<RegistrationStore, 'submit'>;
	visit: Pick<VisitStore, 'submit'>;
	/** Retires the first-visit language introduction: a volunteer has already used the app. */
	guest: Pick<GuestStore, 'markAsReturningVisitor'>;
	checkStatus: (code: string) => Promise<PremarketCodeStatus>;
};

/** Where the page stands: still checking the code, what the check found, or registered. */
export type PremarketEntryState = 'checking' | 'missing' | PremarketCodeStatus | 'registered';

/**
 * A volunteer's way into the premarket from the printed QR: check the code, then register this
 * phone's guest for it. Built by the `/premarket` page for as long as it is open, so nothing of it
 * lands in the guest's first download.
 */
export class PremarketEntryStore {
	state: PremarketEntryState;

	private readonly code: string | null;
	private readonly registration: PremarketEntryOptions['registration'];
	private readonly visit: PremarketEntryOptions['visit'];
	private readonly guest: PremarketEntryOptions['guest'];
	private readonly checkStatus: PremarketEntryOptions['checkStatus'];

	constructor(options: PremarketEntryOptions) {
		this.code = options.code;
		this.registration = options.registration;
		this.visit = options.visit;
		this.guest = options.guest;
		this.checkStatus = options.checkStatus;
		this.state = options.code ? 'checking' : 'missing';
		makeAutoObservable<this, 'code' | 'registration' | 'visit' | 'guest' | 'checkStatus'>(
			this,
			{ code: false, registration: false, visit: false, guest: false, checkStatus: false },
			{ autoBind: true },
		);
	}

	/** Checks the code with the server; the page asks again when the volunteer taps Try Again. */
	async check(): Promise<void> {
		if (!this.code) {
			return;
		}

		this.state = 'checking';
		const status = await this.checkStatus(this.code);

		runInAction(() => {
			this.state = status;
		});
	}

	/**
	 * Registers this phone's guest for the premarket. A refused submission leaves the form as it is;
	 * the registration store says why under the submit button.
	 */
	async submit(locale: string): Promise<void> {
		if (!this.code || this.state !== 'open') {
			return;
		}

		const result = await this.registration.submit('queue', null, locale, {
			premarketCode: this.code,
		});

		if (result.kind !== 'registered' || !result.registration.marketEventId) {
			return;
		}

		this.visit.submit(result.registration, result.registration.marketEventId);
		this.guest.markAsReturningVisitor();
		runInAction(() => {
			this.state = 'registered';
		});
	}
}
