import { makeAutoObservable, runInAction } from 'mobx';

import type { PremarketStatus } from '../services/premarket.ts';
import type { GuestStore } from './guest.store.ts';
import type { RegistrationStore } from './registration.store.ts';
import type { VisitStore } from './visit.store.ts';

type PremarketEntryOptions = {
	registration: Pick<RegistrationStore, 'submit'>;
	visit: Pick<VisitStore, 'submit'>;
	/** Retires the first-visit language introduction: a volunteer has already used the app. */
	guest: Pick<GuestStore, 'markAsReturningVisitor'>;
	checkStatus: () => Promise<PremarketStatus>;
};

/** Where the page stands: still checking, what the check found, or checked in. */
export type PremarketEntryState = 'checking' | PremarketStatus | 'registered';

/**
 * A volunteer's way into the premarket from its link or QR code: check that it is open, then check
 * this phone's guest in for it. Built by the `/premarket` page for as long as it is open, so nothing of it
 * lands in the guest's first download.
 */
export class PremarketEntryStore {
	state: PremarketEntryState = 'checking';

	private readonly registration: PremarketEntryOptions['registration'];
	private readonly visit: PremarketEntryOptions['visit'];
	private readonly guest: PremarketEntryOptions['guest'];
	private readonly checkStatus: PremarketEntryOptions['checkStatus'];

	constructor(options: PremarketEntryOptions) {
		this.registration = options.registration;
		this.visit = options.visit;
		this.guest = options.guest;
		this.checkStatus = options.checkStatus;
		makeAutoObservable<this, 'registration' | 'visit' | 'guest' | 'checkStatus'>(
			this,
			{ registration: false, visit: false, guest: false, checkStatus: false },
			{ autoBind: true },
		);
	}

	/** Asks the server whether the premarket is open; the page asks again on Try Again. */
	async check(): Promise<void> {
		this.state = 'checking';
		const status = await this.checkStatus();

		runInAction(() => {
			this.state = status;
		});
	}

	/**
	 * Registers this phone's guest for the premarket. A refused submission leaves the form as it is;
	 * the registration store says why under the submit button.
	 */
	async submit(locale: string): Promise<void> {
		if (this.state !== 'open') {
			return;
		}

		const result = await this.registration.submit('queue', null, locale, { premarket: true });

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
