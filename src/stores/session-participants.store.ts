import { runInAction } from 'mobx';

import { adminTranslations } from '../adminLocales.ts';
import { BulkStatusCorrection } from '../models/bulk-status-correction.ts';
import { QueueSearch } from '../models/queue-search.ts';
import { SessionParticipants, type ParticipantGroup } from '../models/session-participants.ts';
import { TicketOrder, type TicketOrderKey } from '../models/ticket-order.ts';
import {
	AdminRequestError,
	type AdminApi,
	type AdminGuest,
	type QueueGuest,
} from '../services/admin-api.ts';
import { formatGuestCount } from '../services/guest-count.ts';
import { makeReactive } from '../services/make-reactive.ts';
import type { VisitEvent } from '../services/visit-events.ts';
import type { VisitStatus } from '../services/visitStateMachine.ts';
import { adminVisitStatusLabels } from '../services/visitStatusLabels.ts';
import type { NotificationStore } from './notification.store.ts';
import type { TicketList, TicketSearchResult, TicketSelection } from './ticket-list.ts';

export type SessionParticipantsApi = Pick<
	AdminApi,
	'listSessionGuests' | 'correctVisitStatus' | 'listVisitEvents'
>;

/**
 * The guests of one ended session, as the session history's subview lists them: tickets in a
 * section per status, one open at a time with its history, and correcting the status a visit
 * should have had when it was not recorded right on the day — one ticket at a time, or several
 * picked out together and set to the same status — found by searching, and read in the order the
 * volunteer chooses. Its own store rather than more of
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
	private _selecting = false;
	private readonly _checked = new Set<string>();
	private _correctingChecked = false;
	private _searchQuery = '';
	private _isSearching = false;
	private _orderKey: TicketOrderKey = 'queue';

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

	/** The sections as the list shows them: a status each, in the order the volunteer chose. */
	get groups(): ParticipantGroup<AdminGuest>[] {
		const { order } = this;

		return (this.participants?.groups ?? []).map((group) => ({
			status: group.status,
			guests: order.apply(group.guests),
		}));
	}

	get order(): TicketOrder {
		return new TicketOrder(this._orderKey);
	}

	setOrder(key: TicketOrderKey): void {
		this._orderKey = key;
	}

	get search(): QueueSearch {
		return new QueueSearch(this._searchQuery);
	}

	get isSearching(): boolean {
		return this._isSearching;
	}

	get searchResults(): TicketSearchResult[] {
		const { search } = this;
		const labels = adminVisitStatusLabels('en');

		if (!search.isActive) {
			return [];
		}

		return this.groups
			.map(({ status, guests }) => ({
				section: status,
				title: labels[status],
				guests: guests.filter((guest) => search.matches(guest)),
			}))
			.filter(({ guests }) => guests.length > 0);
	}

	setSearchQuery(query: string): void {
		this._searchQuery = query;
	}

	openSearch(): void {
		this._isSearching = true;
	}

	closeSearch(): void {
		this._isSearching = false;
		this._searchQuery = '';
	}

	/**
	 * Opens the one guest the search found — or, while picking out guests, checks or unchecks them
	 * and leaves the search up for the next.
	 */
	selectSoleSearchResult(): void {
		const found = this.searchResults.flatMap(({ guests }) => guests);

		if (found.length !== 1) {
			return;
		}

		if (this._selecting) {
			this.toggleChecked(found[0]!);
		} else {
			this.select(found[0]!);
		}
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

	/** Whether any correction, of one ticket or of the selection, is on its way to the server. */
	get isCorrecting(): boolean {
		return this._correctingVisitId !== null || this._correctingChecked;
	}

	/** Whether a tap picks a ticket out for a correction of several, rather than opening it. */
	get isSelecting(): boolean {
		return this._selecting;
	}

	get selection(): TicketSelection | null {
		return this._selecting
			? {
					isChecked: (guest) => this.isChecked(guest),
					toggle: (guest) => this.toggleChecked(guest),
				}
			: null;
	}

	/** The guests picked out, in the order the list holds them. */
	get checked(): AdminGuest[] {
		return this._guests?.filter((guest) => this._checked.has(guest.id)) ?? [];
	}

	/** What setting the picked-out guests to one status would change. */
	get bulk(): BulkStatusCorrection<AdminGuest> {
		return new BulkStatusCorrection(this.checked);
	}

	/** Opens a session's guests, read fresh from the server. Opening the one already open rereads it. */
	async load(sessionId: string): Promise<void> {
		if (this._sessionId !== sessionId) {
			this._sessionId = sessionId;
			this._guests = null;
			this._selectedVisitId = null;
			this._history = null;
			this.stopSelecting();
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
		this.stopSelecting();
		this.closeSearch();
	}

	/** Opens a ticket — from the lists, or from the search, which it puts away. */
	select(guest: QueueGuest): void {
		this._selectedVisitId = guest.id;
		this.closeSearch();
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

	/** Starts picking out guests. The open ticket closes, since its sheet would cover the list. */
	startSelecting(): void {
		this._selecting = true;
		this.dismiss();
	}

	stopSelecting(): void {
		this._selecting = false;
		this._checked.clear();
	}

	isChecked(guest: QueueGuest): boolean {
		return this._checked.has(guest.id);
	}

	toggleChecked(guest: QueueGuest): void {
		if (this._checked.has(guest.id)) {
			this._checked.delete(guest.id);
		} else {
			this._checked.add(guest.id);
		}
	}

	/** Picks out every guest in `guests` — one status's section — or, if all are, lets them go. */
	toggleAll(guests: readonly QueueGuest[]): void {
		const all = guests.every((guest) => this._checked.has(guest.id));

		for (const guest of guests) {
			if (all) {
				this._checked.delete(guest.id);
			} else {
				this._checked.add(guest.id);
			}
		}
	}

	/**
	 * Sets every picked-out guest to `status`, one correction at a time, each checked by the server
	 * against the status shown here just as a single one is. Guests already at `status` are left
	 * alone. Those corrected leave the selection, and if every one was, selecting ends; any the
	 * server refused stay picked out to try again. One toast says how it went. Resolves to whether
	 * every correction was saved.
	 */
	async correctChecked(status: VisitStatus): Promise<boolean> {
		const sessionId = this._sessionId;
		const visits = this.bulk.eligible(status);

		if (!sessionId || this.isCorrecting || visits.length === 0) {
			return false;
		}

		this._correctingChecked = true;

		for (const guest of this.bulk.unchanged(status)) {
			this._checked.delete(guest.id);
		}

		const failures: unknown[] = [];

		for (const visit of visits) {
			// The session was left, or another opened, partway through: the rest are not sent.
			if (this._sessionId !== sessionId) {
				break;
			}

			try {
				await this.api.correctVisitStatus(sessionId, visit.id, {
					fromStatus: visit.status,
					status,
				});
				runInAction(() => {
					this._guests =
						this._guests?.map((guest) => (guest.id === visit.id ? { ...guest, status } : guest)) ??
						null;
					this._checked.delete(visit.id);
				});
			} catch (error) {
				failures.push(error);
			}
		}

		const done = visits.length - failures.length;

		runInAction(() => (this._correctingChecked = false));

		if (this._sessionId !== sessionId) {
			return false;
		}

		if (failures.length === 0) {
			runInAction(() => this.stopSelecting());
		}

		if (failures.length === 0) {
			this.notifications.success(
				adminTranslations.en.participants.bulkCorrected.replace('{guests}', formatGuestCount(done)),
			);

			return true;
		}

		this.notifications.error(
			adminTranslations.en.participants.bulkPartlyCorrected
				.replace('{done}', String(done))
				.replace('{total}', String(visits.length))
				.replace(
					'{reason}',
					this.failure(failures[0], adminTranslations.en.participants.correctionFailed),
				),
		);

		return false;
	}

	/**
	 * Sets the status `visit` should have had. The server checks that its status is still the one
	 * shown here, so a correction never overwrites one somebody else just made. The ticket stays
	 * open, its history reread to show the correction. Resolves to whether it was saved.
	 */
	async correct(visit: QueueGuest, status: VisitStatus): Promise<boolean> {
		const sessionId = this._sessionId;

		if (!sessionId || this.isCorrecting) {
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
