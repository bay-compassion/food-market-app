import { makeAutoObservable, runInAction } from 'mobx';

import type { StandbyTicket, StandbyTicketResult } from '../services/standby.ts';
import type { VisitStatus } from '../services/visitStateMachine.ts';
import type { GuestStore } from './guest.store.ts';
import type { RegistrationStore } from './registration.store.ts';
import type { VisitStore } from './visit.store.ts';

/** Where the phone keeps the ticket it pulled, until its guest's details spend it. */
export const heldStandbyTicketKey = 'bay-compassion.standby-ticket';

type StandbyEntryOptions = {
	registration: Pick<RegistrationStore, 'submit'>;
	visit: Pick<VisitStore, 'submit' | 'refresh' | 'belongsTo' | 'status'>;
	/** Retires the first-visit language introduction: this guest has used the app now. */
	guest: Pick<GuestStore, 'markAsReturningVisitor'>;
	pullTicket: (code: string) => Promise<StandbyTicketResult>;
	storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
};

/**
 * Where the page stands: pulling a ticket, why it couldn't, holding one while the guest fills in
 * their details, or joined — or `has_visit`, for a phone whose guest is already in today's line or
 * on the list, which goes home to the card it has.
 */
export type StandbyEntryState =
	| 'checking'
	| 'not_open'
	| 'closed'
	| 'invalid'
	| 'unreachable'
	| 'held'
	| 'joined'
	| 'has_visit';

/**
 * The statuses of a visit this phone already holds that standby leaves alone: still in the line,
 * already on the list, or served. A guest the draw passed over, who cancelled, or who missed their
 * call has nothing to lose, and is who standby is for.
 */
const keptVisitStatuses: readonly VisitStatus[] = ['registered', 'waiting', 'called', 'served'];

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

	/** The pull under way, so a second start — React's double effect, a quick retry — joins it. */
	private pulling: Promise<StandbyTicketResult> | null = null;

	private readonly options: StandbyEntryOptions;

	constructor(options: StandbyEntryOptions) {
		this.options = options;
		makeAutoObservable<this, 'options' | 'pulling'>(
			this,
			{ options: false, pulling: false },
			{ autoBind: true },
		);
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

		if (await this.alreadyHasVisit(code)) {
			runInAction(() => {
				this.state = 'has_visit';
			});

			return;
		}

		const result = await (this.pulling ??= this.options.pullTicket(code));

		this.pulling = null;

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

	/**
	 * Whether this phone's guest already has a visit to the session `code` is for that standby would
	 * leave alone. A ticket would take an S number they'd never use, and show them a place they
	 * don't have. The code starts with the session's id.
	 */
	private async alreadyHasVisit(code: string): Promise<boolean> {
		const marketEventId = code.split('.')[0];

		await this.options.visit.refresh();

		const status = this.options.visit.status;

		return (
			this.options.visit.belongsTo(marketEventId) &&
			status !== null &&
			keptVisitStatuses.includes(status)
		);
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
