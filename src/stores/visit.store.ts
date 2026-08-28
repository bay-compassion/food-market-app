import {
	cancelActiveVisit,
	fetchActiveVisit,
	type ActiveVisit,
	type GuestRegistrationResult,
} from '../services/guestVisitApi.ts';
import { makeReactive } from '../services/make-reactive.ts';

const visitTokenStorageKey = 'bay-compassion.visit-token';
const refreshIntervalMs = 15_000;

export type VisitStoreOptions = {
	storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
	lookupActiveVisit?: typeof fetchActiveVisit;
	cancelVisit?: typeof cancelActiveVisit;
};

/**
 * Owns a guest's active visit: the device-local visit token, the visit itself, and the background
 * refresh that keeps queue position current while it's still live. Lives on the root store, app
 * lifetime — it keeps polling across route changes rather than just while `GuestView` is mounted,
 * since a guest can wander to `/admin` or `/signup` on the same device and come back.
 */
export class VisitStore {
	private _visitToken: string | null;
	private _activeVisit: ActiveVisit | null = null;
	private _isSubmitted = false;
	private _isCancelling = false;
	private _cancelError = false;
	private refreshTimer: ReturnType<typeof setTimeout> | undefined;
	private refreshRequest: Promise<void> | null = null;
	private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
	private readonly lookupActiveVisit: typeof fetchActiveVisit;
	private readonly cancelRequest: typeof cancelActiveVisit;

	get activeVisit(): ActiveVisit | null {
		return this._activeVisit;
	}

	get isSubmitted(): boolean {
		return this._isSubmitted;
	}

	get isCancelling(): boolean {
		return this._isCancelling;
	}

	/** Only ever set by `cancel` — a registration form's own submission error is a separate concern. */
	get cancelError(): boolean {
		return this._cancelError;
	}

	/** An active visit always wins over the session phase in `resolveGuestCardState`. */
	get hasActiveVisit(): boolean {
		return this._activeVisit !== null && this._isSubmitted;
	}

	get isCalled(): boolean {
		return this._activeVisit?.status === 'called';
	}

	get canCancel(): boolean {
		return this._activeVisit?.status === 'registered' || this._activeVisit?.status === 'waiting';
	}

	get queuePosition(): number | null {
		return this._activeVisit?.status === 'waiting' ? this._activeVisit.queuePosition : null;
	}

	get guestsAhead(): number | null {
		return this._activeVisit?.status === 'waiting' ? this._activeVisit.aheadOfYou : null;
	}

	/**
	 * A called guest still needs updates — refreshing only while the visit can be cancelled meant the
	 * screen froze on "Called" and never moved on.
	 */
	private get isLive(): boolean {
		return (
			this._activeVisit?.status === 'registered' ||
			this._activeVisit?.status === 'waiting' ||
			this._activeVisit?.status === 'called'
		);
	}

	constructor(options: VisitStoreOptions = {}) {
		this.storage = options.storage ?? window.localStorage;
		this.lookupActiveVisit = options.lookupActiveVisit ?? fetchActiveVisit;
		this.cancelRequest = options.cancelVisit ?? cancelActiveVisit;
		this._visitToken = this.storage.getItem(visitTokenStorageKey);

		return makeReactive(this);
	}

	[Symbol.dispose](): void {
		clearTimeout(this.refreshTimer);
	}

	/** Records a registration just submitted through `GuestRegistrationForm`. */
	submit(registration: GuestRegistrationResult): void {
		this.storage.setItem(visitTokenStorageKey, registration.visitToken);
		this._visitToken = registration.visitToken;
		this._activeVisit = {
			id: registration.id,
			status: registration.status,
			queuePosition: null,
			aheadOfYou: null,
		};
		this._isSubmitted = true;
		this.scheduleRefresh();
	}

	/**
	 * Looks up the stored token's visit, if any, and schedules the next refresh. Reuses an
	 * already-running lookup so `GuestView` mounting while the root's own startup refresh is still in
	 * flight doesn't fire a second request.
	 */
	async refresh(): Promise<void> {
		if (this.refreshRequest) {
			return this.refreshRequest;
		}

		this.refreshRequest = this.performRefresh().finally(() => {
			this.refreshRequest = null;
		});

		return this.refreshRequest;
	}

	async cancel(): Promise<void> {
		if (!this._visitToken) {
			return;
		}

		this._isCancelling = true;
		this._cancelError = false;

		try {
			const visit = await this.cancelRequest(this._visitToken);

			this._activeVisit = { ...this._activeVisit!, ...visit };
		} catch {
			this._cancelError = true;
		} finally {
			this._isCancelling = false;
		}
	}

	private async performRefresh(): Promise<void> {
		if (!this._visitToken) {
			return;
		}

		const lookup = await this.lookupActiveVisit(this._visitToken);

		if (!lookup.found) {
			if (lookup.reason === 'unreachable') {
				// Keep registration available if status refresh is temporarily unavailable.
				return;
			}
			this.storage.removeItem(visitTokenStorageKey);
			this._visitToken = null;
			this._activeVisit = null;
			this._isSubmitted = false;
			this.scheduleRefresh();

			return;
		}
		this._activeVisit = lookup.visit;
		this._isSubmitted = true;
		this.scheduleRefresh();
	}

	private scheduleRefresh(): void {
		clearTimeout(this.refreshTimer);

		if (this.isLive) {
			this.refreshTimer = setTimeout(() => void this.refresh(), refreshIntervalMs);
		}
	}
}
