import { runInAction } from 'mobx';

import { adminTranslations } from '../adminLocales.ts';
import { SessionParticipants } from '../models/session-participants.ts';
import {
	AdminRequestError,
	type AdminApi,
	type AdminGuest,
	type QueueGuest,
} from '../services/admin-api.ts';
import { makeReactive } from '../services/make-reactive.ts';
import type { VisitEvent } from '../services/visit-events.ts';
import type { VisitStatus } from '../services/visitStateMachine.ts';
import type { NotificationStore } from './notification.store.ts';
import type { TicketList } from './ticket-list.ts';

export type SessionParticipantsApi = Pick<
	AdminApi,
	'listSessionGuests' | 'correctVisitStatus' | 'listVisitEvents'
>;

/**
 * The guests of one ended session, as the session history's subview lists them: tickets in a
 * section per status, one open at a time with its history, and correcting the status a visit
 * should have had when it was not recorded right on the day. Its own store rather than more of
 * `AdminStore`, which only hands it the API; the route says which session is open.
 */
export class SessionParticipantsStore implements TicketList {
	private _sessionId: string | null = null;
	private _guests: AdminGuest[] | null = null;
	private _loadFailed = false;
	private _selectedVisitId: string | null = null;
	private _history: { visitId: string; events: VisitEvent[] } | null = null;
	private readonly _collapsed = new Set<string>();
	private _correctingVisitId: string | null = null;

	constructor(
		private readonly api: SessionParticipantsApi,
		private readonly notifications: NotificationStore,
	) {
		makeReactive(this, { api: false, notifications: false });
	}

	/** The session whose guests are open; `null` while none is. */
	get sessionId(): string | null {
		return this._sessionId;
	}

	/** The open session's guests, grouped by status; `null` until they have loaded. */
	get participants(): SessionParticipants<AdminGuest> | null {
		return this._guests ? new SessionParticipants(this._guests) : null;
	}

	/** Whether the guests could not be read, so the subview can say so and offer to try again. */
	get loadFailed(): boolean {
		return this._loadFailed;
	}

	/** The open ticket's guest, read from the list so a correction shows on it straight away. */
	get selected(): AdminGuest | null {
		return this._guests?.find((guest) => guest.id === this._selectedVisitId) ?? null;
	}

	get history(): VisitEvent[] | null {
		return this._history?.visitId === this._selectedVisitId ? this._history.events : null;
	}

	/** The visit whose correction is on its way to the server. */
	get correctingVisitId(): string | null {
		return this._correctingVisitId;
	}

	/** Opens a session's guests, read fresh from the server. Opening the one already open rereads it. */
	async load(sessionId: string): Promise<void> {
		if (this._sessionId !== sessionId) {
			this._sessionId = sessionId;
			this._guests = null;
			this._selectedVisitId = null;
			this._history = null;
		}

		this._loadFailed = false;

		try {
			const guests = await this.api.listSessionGuests(sessionId);

			runInAction(() => {
				// Closed, or another session opened, while this one was loading.
				if (this._sessionId === sessionId) {
					this._guests = guests;
				}
			});
		} catch (error) {
			runInAction(() => {
				if (this._sessionId === sessionId) {
					this._loadFailed = true;
				}
			});
			this.notifications.error(this.failure(error, adminTranslations.en.participants.loadFailed));
		}
	}

	/** Leaves the session: the subview is gone, and the next one opened starts afresh. */
	close(): void {
		this._sessionId = null;
		this._guests = null;
		this._loadFailed = false;
		this._selectedVisitId = null;
		this._history = null;
	}

	select(guest: QueueGuest): void {
		this._selectedVisitId = guest.id;
		void this.loadHistory();
	}

	dismiss(): void {
		this._selectedVisitId = null;
	}

	isCollapsed(section: string): boolean {
		return this._collapsed.has(section);
	}

	toggleSection(section: string): void {
		if (this._collapsed.has(section)) {
			this._collapsed.delete(section);
		} else {
			this._collapsed.add(section);
		}
	}

	/**
	 * Sets the status `visit` should have had. The server checks that its status is still the one
	 * shown here, so a correction never overwrites one somebody else just made. The ticket stays
	 * open, its history reread to show the correction. Resolves to whether it was saved.
	 */
	async correct(visit: QueueGuest, status: VisitStatus): Promise<boolean> {
		const sessionId = this._sessionId;

		if (!sessionId || this._correctingVisitId) {
			return false;
		}

		this._correctingVisitId = visit.id;

		try {
			await this.api.correctVisitStatus(sessionId, visit.id, {
				fromStatus: visit.status,
				status,
			});
			runInAction(() => {
				this._guests =
					this._guests?.map((guest) => (guest.id === visit.id ? { ...guest, status } : guest)) ??
					null;
			});
			this.notifications.success(adminTranslations.en.participants.corrected);
		} catch (error) {
			this.notifications.error(
				this.failure(error, adminTranslations.en.participants.correctionFailed),
			);

			return false;
		} finally {
			runInAction(() => (this._correctingVisitId = null));
		}

		if (this._selectedVisitId === visit.id) {
			await this.loadHistory();
		}

		return true;
	}

	/** Reads the open ticket's history. A failed read shows an empty history, never an error. */
	private async loadHistory(): Promise<void> {
		const visitId = this._selectedVisitId;

		if (!visitId) {
			return;
		}

		const events = await this.api.listVisitEvents(visitId).catch(() => []);

		runInAction(() => {
			if (this._selectedVisitId === visitId) {
				this._history = { visitId, events };
			}
		});
	}

	private failure(error: unknown, fallback: string): string {
		return error instanceof AdminRequestError && error.reason ? error.reason : fallback;
	}
}
