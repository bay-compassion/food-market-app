import { runInAction } from 'mobx';

import { adminTranslations } from '../adminLocales.ts';
import { GuestProfile } from '../models/guest-profile.ts';
import type { GuestProfileRecord, RelatedGuestRecord } from '../models/guest-profile.ts';
import { AdminRequestError, type AdminApi } from '../services/admin-api.ts';
import { makeReactive } from '../services/make-reactive.ts';
import type { VisitEvent } from '../services/visit-events.ts';
import type { NotificationStore } from './notification.store.ts';

export type GuestProfileApi = Pick<
	AdminApi,
	'getGuestProfile' | 'listVisitEvents' | 'listRelatedGuests'
>;

/**
 * The guest whose profile is open from the guest database. Its own store rather than more of
 * `AdminStore`, which only hands it the API; the route says which guest is open.
 */
export class GuestProfileStore {
	private _guestId: string | null = null;
	private _record: GuestProfileRecord | null = null;
	private _loadFailed = false;
	private _openVisitId: string | null = null;
	private _history: { visitId: string; events: VisitEvent[] } | null = null;
	private _related: { guestId: string; records: RelatedGuestRecord[] } | null = null;
	private _relatedFailed = false;

	constructor(
		private readonly api: GuestProfileApi,
		private readonly notifications: NotificationStore,
	) {
		makeReactive(this, { api: false, notifications: false });
	}

	/** The guest whose profile is open; `null` while none is. */
	get guestId(): string | null {
		return this._guestId;
	}

	/** The open guest's profile; `null` until it has loaded. */
	get profile(): GuestProfile | null {
		return this._record ? new GuestProfile(this._record) : null;
	}

	/** Whether the record could not be read, so the screen can say so and offer to try again. */
	get loadFailed(): boolean {
		return this._loadFailed;
	}

	/** The visit opened on the Visits tab; `null` while none is. */
	get openVisitId(): string | null {
		return this._openVisitId;
	}

	/** What has happened to the open visit, oldest first; `null` until it has loaded. */
	get openVisitHistory(): VisitEvent[] | null {
		return this._history?.visitId === this._openVisitId ? this._history.events : null;
	}

	/** The other records linked to the open guest, the same person first; `null` until read. */
	get related(): RelatedGuestRecord[] | null {
		return this._related?.guestId === this._guestId ? this._related.records : null;
	}

	/** Whether the linked records could not be read. */
	get relatedFailed(): boolean {
		return this._relatedFailed;
	}

	/**
	 * Reads the records linked to the open guest. Asked for by the Records tab only, since it reads
	 * every guest's name and phones on the server to work the links out.
	 */
	async loadRelated(): Promise<void> {
		const guestId = this._guestId;

		if (!guestId) {
			return;
		}

		this._relatedFailed = false;

		try {
			const records = await this.api.listRelatedGuests(guestId);

			runInAction(() => {
				if (this._guestId === guestId) {
					this._related = { guestId, records };
				}
			});
		} catch {
			runInAction(() => {
				if (this._guestId === guestId) {
					this._relatedFailed = true;
				}
			});
		}
	}

	/** Opens a visit to show its history, or closes it when it is the one already open. */
	toggleVisit(visitId: string): void {
		if (this._openVisitId === visitId) {
			this._openVisitId = null;

			return;
		}

		this._openVisitId = visitId;
		void this.loadHistory(visitId);
	}

	/**
	 * Reads the guest's record. Run again after a change to one of their visits: a reload keeps the
	 * profile on screen while it reads, so a command does not blank the page.
	 */
	async load(guestId: string): Promise<void> {
		if (this._guestId !== guestId) {
			this._guestId = guestId;
			this._record = null;
			this._openVisitId = null;
			this._history = null;
			this._related = null;
		}

		this._loadFailed = false;

		try {
			const record = await this.api.getGuestProfile(guestId);

			runInAction(() => {
				// Closed, or another guest opened, while this one was loading.
				if (this._guestId === guestId) {
					this._record = record;
				}
			});
		} catch (error) {
			runInAction(() => {
				if (this._guestId === guestId) {
					this._loadFailed = true;
				}
			});
			this.notifications.error(
				error instanceof AdminRequestError && error.reason
					? error.reason
					: adminTranslations.en.guestProfile.loadFailed,
			);
		}
	}

	/** Leaves the profile: the screen is gone, and the next guest opened starts afresh. */
	close(): void {
		this._guestId = null;
		this._record = null;
		this._loadFailed = false;
		this._openVisitId = null;
		this._history = null;
		this._related = null;
		this._relatedFailed = false;
	}

	/**
	 * Reads a visit's history. A failure leaves it empty rather than raising a toast: the history
	 * is context for the visit, and the visit itself is already on screen.
	 */
	private async loadHistory(visitId: string): Promise<void> {
		const events = await this.api.listVisitEvents(visitId).catch(() => []);

		runInAction(() => {
			if (this._openVisitId === visitId) {
				this._history = { visitId, events };
			}
		});
	}
}
