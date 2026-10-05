import { reaction, runInAction, type IReactionDisposer } from 'mobx';

import type { QueueGuest } from '../services/admin-api.ts';
import {
	manualAdmissionsFor,
	type ManualAdmission,
	type QueuePlacement,
} from '../services/guestAdmission.ts';
import { makeReactive } from '../services/make-reactive.ts';
import { PageVisibilityPoller } from '../services/page-visibility-poller.ts';
import { QueueRoster } from '../services/queue-roster.ts';
import { SessionStatusEnum } from '../services/sessionStateMachine.ts';
import type { VisitEvent } from '../services/visit-events.ts';
import type { VisitCommand } from '../services/visitStateMachine.ts';
import type { AdminStore } from './admin.store.ts';
import type { MarketSessionStore } from './market-session.store.ts';

export type QueueDeskStoreOptions = {
	pollIntervalMs?: number;
};

/** Which screen the queue desk shows. */
export type QueueDeskPhase = 'loading' | 'not_permitted' | 'not_started' | 'serving' | 'ended';

const defaultPollIntervalMs = 5_000;

/**
 * The `/queue` screen's state: the session's guests, kept fresh for several volunteers working the
 * same line from their own phones, and the one ticket this volunteer has open.
 *
 * Screen-lifetime, like `KioskStore` — it polls only while the screen is up. It composes over
 * `AdminStore`, which still owns the guest list and every command that changes it, and reads none
 * of the guest database or history the dashboard loads: this screen runs on a volunteer's phone.
 */
export class QueueDeskStore {
	private _selectedVisitId: string | null = null;
	private _isStarted = false;
	private readonly poller: PageVisibilityPoller;
	private request: Promise<void> | null = null;
	/** The open ticket's history, and which visit it belongs to — it outlives a switch of ticket. */
	private _history: { visitId: string; events: VisitEvent[] } | null = null;
	private readonly stopHistory: IReactionDisposer;

	constructor(
		private readonly admin: AdminStore,
		private readonly session: MarketSessionStore,
		options: QueueDeskStoreOptions = {},
	) {
		this.poller = new PageVisibilityPoller(
			() => void this.refresh(),
			options.pollIntervalMs ?? defaultPollIntervalMs,
			() => {},
		);

		makeReactive(this, {
			admin: false,
			session: false,
			poller: false,
			request: false,
			stopHistory: false,
		});

		// Read when a ticket opens, and again when its status changes — usually another volunteer
		// acting on the same guest. Not on every poll: the history only grows when the status moves.
		this.stopHistory = reaction(
			() => (this.selected ? `${this.selected.id}:${this.selected.status}` : null),
			(key) => {
				if (key) {
					void this.loadHistory();
				}
			},
		);
	}

	/**
	 * The open ticket's history, oldest first, or `null` until it has loaded. A reload for the same
	 * ticket keeps the previous list on screen rather than blanking it.
	 */
	get history(): VisitEvent[] | null {
		return this._history?.visitId === this._selectedVisitId ? this._history.events : null;
	}

	/** Reads the open ticket's history. A failed read shows an empty history, never an error. */
	async loadHistory(): Promise<void> {
		const visitId = this._selectedVisitId;

		if (!visitId) {
			return;
		}

		const events = await this.admin.listVisitEvents(visitId).catch(() => []);

		runInAction(() => {
			// The volunteer may have moved on to another ticket while this was in flight.
			if (this._selectedVisitId === visitId) {
				this._history = { visitId, events };
			}
		});
	}

	get phase(): QueueDeskPhase {
		if (!this._isStarted) {
			return 'loading';
		}

		if (!this.admin.can('run:queue')) {
			return 'not_permitted';
		}

		switch (this.session.currentStatus) {
			case SessionStatusEnum.SERVICE_STARTED:
				return 'serving';
			case SessionStatusEnum.ENDED:
				return 'ended';
			default:
				return 'not_started';
		}
	}

	/** The current session's guests. The admin list can briefly hold a previous session's. */
	get guests(): QueueGuest[] {
		const eventId = this.session.currentState?.event?.id;

		return this.admin.sessionGuests.filter((guest) => guest.marketEventId === eventId);
	}

	get roster(): QueueRoster {
		return new QueueRoster(this.guests);
	}

	/**
	 * The open ticket, looked up by visit on every read: a poll replaces the guest list wholesale,
	 * so a guest object held from before it would show a status another volunteer already changed.
	 */
	get selected(): QueueGuest | null {
		return this.guests.find((guest) => guest.id === this._selectedVisitId) ?? null;
	}

	/** How a guest added by hand can enter the session as it stands now. */
	get admissions(): ManualAdmission[] {
		return this.session.currentState ? manualAdmissionsFor(this.session.currentStatus) : [];
	}

	get isBusy(): boolean {
		return this.admin.isBusy;
	}

	/** Reads who this worker is and where the session stands, then keeps the line fresh. */
	async start(): Promise<void> {
		await this.admin.loadPermissions();

		if (this.admin.can('run:queue')) {
			// The guest list is keyed by the session, so the session has to be known first.
			await this.session.getStatus();
			await this.admin.refreshSessionGuests().catch(() => {});
			this.poller.start();
		}

		runInAction(() => (this._isStarted = true));
	}

	/** Reads the line once. A read already in flight is shared rather than doubled up. */
	refresh(): Promise<void> {
		this.request ??= this.admin
			.refreshSessionGuests()
			.catch(() => {})
			.finally(() => (this.request = null));

		return this.request;
	}

	select(guest: QueueGuest): void {
		this._selectedVisitId = guest.id;
	}

	dismiss(): void {
		this._selectedVisitId = null;
	}

	/**
	 * Calls the next guest in line and opens their ticket, which is where the name tag is. The
	 * server picks the guest, so two volunteers tapping at once each get a different one.
	 */
	async callNext(): Promise<void> {
		const [called] = await this.admin.callNext(1);

		if (called) {
			runInAction(() => (this._selectedVisitId = called));
		}
	}

	/**
	 * Whether a guest can be served and the next one called in one step. Only for the guest called
	 * most recently: the line advances past them and nobody else, so serving a late arrival who was
	 * called earlier must not call someone new while the current guest is still on their way. And
	 * only while someone is waiting to be called.
	 */
	canServeAndCallNext(guest: QueueGuest): boolean {
		const { roster } = this;

		return roster.mostRecentlyCalled?.id === guest.id && roster.waiting.length > 0;
	}

	/**
	 * Serves the guest whose ticket is open and calls the next one, opening their ticket in its
	 * place — or closing it, when nobody was left to call.
	 */
	async serveAndCallNext(guest: QueueGuest): Promise<void> {
		this._selectedVisitId = null;

		const [called] = await this.admin.serveAndCallNext(guest);

		if (called) {
			runInAction(() => (this._selectedVisitId = called));
		}
	}

	/**
	 * Runs a visit command. A guest returned to the queue goes where `placement` says — behind
	 * everyone unless the volunteer chose otherwise: a no-show has lost their turn, and a guest
	 * called by mistake is the rarer case.
	 */
	async run(
		guest: QueueGuest,
		command: VisitCommand,
		placement: QueuePlacement = 'end',
	): Promise<void> {
		await this.admin.runGuestCommand(
			guest,
			command,
			command === 'return_to_queue' ? placement : undefined,
		);
	}

	/** Ends the day's session. Whether to ask first is the screen's call, not the store's. */
	async closeSession(): Promise<void> {
		await this.admin.runMarketAction('close_session');
	}

	[Symbol.dispose](): void {
		this.poller.stop();
		this.stopHistory();
	}
}
