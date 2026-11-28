import { makeAutoObservable, runInAction } from 'mobx';

import type { StandbyTicket, StandbyTicketResult } from '../services/standby.ts';
import type { GuestStore } from './guest.store.ts';
import type { RegistrationStore } from './registration.store.ts';
import type { VisitStore } from './visit.store.ts';

/** Where the phone keeps the ticket it pulled, until its guest's details spend it. */
export const heldStandbyTicketKey = 'bay-compassion.standby-ticket';

type StandbyEntryOptions = {
	registration: Pick<RegistrationStore, 'submit'>;
	visit: Pick<VisitStore, 'submit'>;
	/** Retires the first-visit language introduction: this guest has used the app now. */
	guest: Pick<GuestStore, 'markAsReturningVisitor'>;
	pullTicket: (code: string) => Promise<StandbyTicketResult>;
	storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
};

/**
 * Where the page stands: pulling a ticket, why it couldn't, holding one while the guest fills in
 * their details, or joined.
 */
export type StandbyEntryState =
	| 'checking'
	| 'not_open'
	| 'closed'
	| 'invalid'
	| 'unreachable'
	| 'held'
	| 'joined';

/**
 * A guest's way onto the standby list from the code they scanned at the market: pull a ticket,
 * which holds their place in scan order, then spend it with their details.
 *
 * The phone keeps the ticket it was given and never asks for a second for the same session: every
 * ticket takes the next S number, so asking again — on a reload, or a second scan — would move the
 * guest down the list. Built by the `/standby` page for as long as it is open, so nothing of it
 * lands in the guest's first download. See `docs/standby.md`.
 */
export class StandbyEntryStore {
	state: StandbyEntryState = 'checking';
	ticket: StandbyTicket | null = null;

	private readonly options: StandbyEntryOptions;

	constructor(options: StandbyEntryOptions) {
		this.options = options;
		makeAutoObservable<this, 'options'>(this, { options: false }, { autoBind: true });
	}

	/** Holds a place for `code`: the ticket this phone already holds for it, or a new one. */
	async start(code: string | null): Promise<void> {
		if (!code) {
			this.state = 'invalid';

			return;
		}

		const held = this.heldTicket();

		if (held?.code === code) {
			this.hold(held);

			return;
		}

		this.state = 'checking';
		const result = await this.options.pullTicket(code);

		runInAction(() => {
			if (result.kind === 'ticket') {
				this.options.storage.setItem(heldStandbyTicketKey, JSON.stringify(result.ticket));
				this.hold(result.ticket);
			} else {
				this.state = result.kind;
			}
		});
	}

	/**
	 * Joins the list with this phone's guest's details, spending the ticket. A refused submission
	 * leaves the form as it is; the registration store says why under the submit button.
	 */
	async submit(locale: string): Promise<void> {
		const ticket = this.ticket;

		if (this.state !== 'held' || !ticket) {
			return;
		}

		const result = await this.options.registration.submit('queue', ticket.marketEventId, locale, {
			standbyTicket: ticket.ticket,
		});

		if (result.kind !== 'registered') {
			return;
		}

		this.options.visit.submit(result.registration, ticket.marketEventId);
		this.options.guest.markAsReturningVisitor();
		this.options.storage.removeItem(heldStandbyTicketKey);
		runInAction(() => {
			this.state = 'joined';
		});
	}

	private hold(ticket: StandbyTicket): void {
		this.ticket = ticket;
		this.state = 'held';
	}

	private heldTicket(): StandbyTicket | null {
		try {
			const saved = this.options.storage.getItem(heldStandbyTicketKey);

			return saved ? (JSON.parse(saved) as StandbyTicket) : null;
		} catch {
			return null;
		}
	}
}
