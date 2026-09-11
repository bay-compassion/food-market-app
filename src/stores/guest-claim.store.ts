import { runInAction } from 'mobx';

import { redeemGuestClaim } from '../services/guestVisitApi.ts';
import { makeReactive } from '../services/make-reactive.ts';
import type { GuestStore } from './guest.store.ts';
import type { VisitStore } from './visit.store.ts';

export type GuestClaimState = 'idle' | 'claiming' | 'failed';

export type GuestClaimStoreOptions = {
	redeem?: typeof redeemGuestClaim;
};

/**
 * Turns this phone into the device for a guest a worker added by hand, from the single-use code in
 * the QR code the worker showed them.
 *
 * Claiming replaces this browser's identity and visit outright. The server keeps only hashes of
 * the credentials it hands out, so whatever this phone held before cannot be recovered afterwards —
 * which is why `replacesExistingData` exists for the screen to warn with before the guest commits.
 */
export class GuestClaimStore {
	private _state: GuestClaimState = 'idle';
	private readonly redeemRequest: typeof redeemGuestClaim;

	get state(): GuestClaimState {
		return this._state;
	}

	/** Whether claiming would overwrite a saved identity or visit — possibly someone else's. */
	get replacesExistingData(): boolean {
		return this.guest.isIdentified || this.visit.currentVisit !== null;
	}

	constructor(
		private readonly guest: GuestStore,
		private readonly visit: VisitStore,
		options: GuestClaimStoreOptions = {},
	) {
		this.redeemRequest = options.redeem ?? redeemGuestClaim;

		return makeReactive(this, { guest: false, visit: false, redeemRequest: false });
	}

	/** Forgets an earlier attempt's outcome, so a freshly scanned code starts from a clean screen. */
	reset(): void {
		this._state = 'idle';
	}

	/** Resolves to whether the claim succeeded. A failure leaves this phone exactly as it was. */
	async redeem(token: string): Promise<boolean> {
		this._state = 'claiming';

		try {
			const claimed = await this.redeemRequest(token);

			runInAction(() => {
				this.guest.adopt(claimed.deviceToken, claimed.identity);
				this.visit.reset();

				if (claimed.visit) {
					this.visit.submit(claimed.visit, claimed.visit.marketEventId);
				}

				this._state = 'idle';
			});
			// Consent belongs to the guest now on this phone, not to whoever was here before.
			void this.guest.refreshNotificationSettings().catch(() => undefined);

			return true;
		} catch {
			runInAction(() => (this._state = 'failed'));

			return false;
		}
	}
}
