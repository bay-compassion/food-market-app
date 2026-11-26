import { runInAction } from 'mobx';

import { adminTranslations } from '../adminLocales.ts';
import { GuestProfile } from '../models/guest-profile.ts';
import type { GuestProfileRecord } from '../models/guest-profile.ts';
import { AdminRequestError, type AdminApi } from '../services/admin-api.ts';
import { makeReactive } from '../services/make-reactive.ts';
import type { NotificationStore } from './notification.store.ts';

export type GuestProfileApi = Pick<AdminApi, 'getGuestProfile'>;

/**
 * The guest whose profile is open from the guest database. Its own store rather than more of
 * `AdminStore`, which only hands it the API; the route says which guest is open.
 */
export class GuestProfileStore {
	private _guestId: string | null = null;
	private _record: GuestProfileRecord | null = null;
	private _loadFailed = false;

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

	/**
	 * Reads the guest's record. Run again after a change to one of their visits: a reload keeps the
	 * profile on screen while it reads, so a command does not blank the page.
	 */
	async load(guestId: string): Promise<void> {
		if (this._guestId !== guestId) {
			this._guestId = guestId;
			this._record = null;
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
	}
}
