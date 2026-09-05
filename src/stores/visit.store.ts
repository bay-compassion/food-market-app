import { type IReactionDisposer, reaction, runInAction } from 'mobx';

import type { VisitStatus } from '@/services/visitStateMachine.ts';
import type { SessionOverview } from '@/stores/market-session.store.ts';

import {
	cancelCurrentVisit,
	type CurrentVisit,
	fetchCurrentVisit,
	type GuestRegistrationResult,
} from '../services/guestVisitApi.ts';
import { makeReactive } from '../services/make-reactive.ts';

const visitTokenStorageKey = 'bay-compassion.visit-token';
const defaultRefreshIntervalMs = 15_000;

export type VisitStoreOptions = {
	storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
	lookupCurrentVisit?: typeof fetchCurrentVisit;
	cancelVisit?: typeof cancelCurrentVisit;
	refreshIntervalMs?: number;
};

type VisitStoreRoot = {
	session: { readonly currentState: SessionOverview | null };
};

/**
 * Owns a guest's current visit: the device-local visit token, the visit itself, and the background
 * refresh that keeps queue position current while it's still live. Lives on the root store, app
 * lifetime — it keeps polling across route changes rather than just while `GuestView` is mounted,
 * since a guest can wander to `/admin` or `/signup` on the same device and come back.
 */
export class VisitStore {
	private _visitToken: string | null;
	private _currentVisit: CurrentVisit | null = null;
	private _isCancelling = false;
	private _cancelError = false;
	private refreshTimer: ReturnType<typeof setTimeout> | undefined;
	private refreshRequest: Promise<void> | null = null;
	private _nextRefreshAt: number | null = null;
	/** How long a full refresh cycle lasts, so a countdown can render its progress through one. */
	readonly refreshIntervalMs: number;
	private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
	private readonly lookupCurrentVisit: typeof fetchCurrentVisit;
	private readonly cancelRequest: typeof cancelCurrentVisit;

	private disposers = new Set<IReactionDisposer>();

	get currentVisit(): CurrentVisit | null {
		return this._currentVisit;
	}

	get status(): VisitStatus | null {
		return this._currentVisit?.status ?? null;
	}

	get isCancelling(): boolean {
		return this._isCancelling;
	}

	/** Only ever set by `cancel` — a registration form's own submission error is a separate concern. */
	get cancelError(): boolean {
		return this._cancelError;
	}

	get isCalled(): boolean {
		return this._currentVisit?.status === 'called';
	}

	get canCancel(): boolean {
		return this._currentVisit?.status === 'registered' || this._currentVisit?.status === 'waiting';
	}

	get queuePosition(): number | null {
		return this._currentVisit?.status === 'waiting' ? this._currentVisit.queuePosition : null;
	}

	get guestsAhead(): number | null {
		return this._currentVisit?.status === 'waiting' ? this._currentVisit.aheadOfYou : null;
	}

	/**
	 * When the next background refresh is due, as epoch milliseconds, or `null` while none is
	 * scheduled. Guests reach for the browser's reload button when nothing on screen admits that
	 * the queue is updating on its own, so the schedule is state the UI can show rather than a
	 * detail hidden inside a timer handle.
	 */
	get nextRefreshAt(): number | null {
		return this._nextRefreshAt;
	}

	/**
	 * A called guest still needs updates — refreshing only while the visit can be cancelled meant the
	 * screen froze on "Called" and never moved on.
	 */
	private get needsPolling(): boolean {
		return (
			this._currentVisit?.status === 'registered' ||
			this._currentVisit?.status === 'waiting' ||
			this._currentVisit?.status === 'called' ||
			this._currentVisit?.status === 'no_show'
		);
	}

	constructor(
		private readonly rootStore: VisitStoreRoot,
		options: VisitStoreOptions = {},
	) {
		this.storage = options.storage ?? window.localStorage;
		this.refreshIntervalMs = options.refreshIntervalMs ?? defaultRefreshIntervalMs;
		this.lookupCurrentVisit = options.lookupCurrentVisit ?? fetchCurrentVisit;
		this.cancelRequest = options.cancelVisit ?? cancelCurrentVisit;
		this._visitToken = this.storage.getItem(visitTokenStorageKey);

		this.disposers.add(
			reaction(
				() => {
					const sessionState = this.rootStore.session.currentState;

					return [
						sessionState !== null,
						sessionState?.event?.id ?? null,
						this.currentVisit?.marketEventId ?? null,
					] as const;
				},
				([hasSessionState, marketEventId, visitMarketEventId]) => {
					if (!hasSessionState || !visitMarketEventId) {
						return;
					}

					if (marketEventId !== visitMarketEventId) {
						this.reset();
					}
				},
			),
		);

		return makeReactive(this, {
			storage: false,
			lookupCurrentVisit: false,
			cancelRequest: false,
			refreshIntervalMs: false,
			refreshTimer: false,
			refreshRequest: false,
		});
	}

	[Symbol.dispose](): void {
		clearTimeout(this.refreshTimer);
		// A symbol-keyed member is not annotated as an action, so the write needs its own.
		runInAction(() => (this._nextRefreshAt = null));

		for (const disposer of this.disposers) {
			disposer();
		}

		this.disposers.clear();
	}

	reset() {
		this.storage.removeItem(visitTokenStorageKey);
		this._visitToken = null;
		this._currentVisit = null;
		this.scheduleRefresh();
	}

	/** Records a registration just submitted through `GuestCombinedForm`. */
	submit(registration: GuestRegistrationResult, marketEventId: string): void {
		this.storage.setItem(visitTokenStorageKey, registration.visitToken);
		this._visitToken = registration.visitToken;
		this._currentVisit = {
			id: registration.id,
			marketEventId,
			status: registration.status,
			queuePosition: null,
			aheadOfYou: null,
		};
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

			runInAction(() => {
				this._currentVisit = { ...this._currentVisit!, ...visit };
			});
		} catch {
			runInAction(() => (this._cancelError = true));
		} finally {
			runInAction(() => (this._isCancelling = false));
		}
	}

	private async performRefresh(): Promise<void> {
		if (!this._visitToken) {
			return;
		}

		const lookup = await this.lookupCurrentVisit(this._visitToken);

		if (!lookup.found) {
			if (lookup.reason === 'unreachable') {
				// Keep registration available if status refresh is temporarily unavailable.
				return;
			}
			this.storage.removeItem(visitTokenStorageKey);
			runInAction(() => {
				this._visitToken = null;
				this._currentVisit = null;
			});
			this.scheduleRefresh();

			return;
		}
		runInAction(() => {
			this._currentVisit = lookup.visit;
		});
		this.scheduleRefresh();
	}

	/**
	 * The single place the refresh schedule is written, so `nextRefreshAt` cannot outlive its timer
	 * and leave a countdown ticking on a visit that has stopped refreshing.
	 */
	private scheduleRefresh(): void {
		clearTimeout(this.refreshTimer);

		if (this.needsPolling) {
			this.refreshTimer = setTimeout(() => void this.refresh(), this.refreshIntervalMs);
			runInAction(() => (this._nextRefreshAt = Date.now() + this.refreshIntervalMs));
		} else {
			runInAction(() => (this._nextRefreshAt = null));
		}
	}
}
