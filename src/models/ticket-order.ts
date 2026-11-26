import type { QueueGuest } from '../services/admin-api.ts';
import { QueueNumber } from './queue-number.ts';

/**
 * How a ticket list is ordered on screen. `queue` keeps each section's own order — the line for
 * those waiting, call time for those called, the number for the rest; the others order by name.
 */
export type TicketOrderKey = 'queue' | 'firstName' | 'lastName';

/**
 * The order a volunteer chose to read a ticket list in. Display only: who is called next is decided
 * by the line, never by this — which is why the queue keeps its waiting list out of it.
 */
export class TicketOrder {
	static readonly keys: readonly TicketOrderKey[] = ['queue', 'firstName', 'lastName'];

	private static readonly collator = new Intl.Collator('en', { sensitivity: 'base' });

	constructor(readonly key: TicketOrderKey = 'queue') {}

	/** Whether the lists are in the order the queue keeps them, rather than one chosen to read by. */
	get isQueueOrder(): boolean {
		return this.key === 'queue';
	}

	/** `guests` in this order, given in the section's own order; never sorts in place. */
	apply<Guest extends QueueGuest>(guests: readonly Guest[]): Guest[] {
		return this.isQueueOrder ? [...guests] : [...guests].sort((a, b) => this.compare(a, b));
	}

	private compare(first: QueueGuest, second: QueueGuest): number {
		type NameField = keyof Pick<QueueGuest, 'firstName' | 'lastName'>;
		const [primary, secondary]: [NameField, NameField] =
			this.key === 'firstName' ? ['firstName', 'lastName'] : ['lastName', 'firstName'];

		return (
			TicketOrder.collator.compare(first[primary], second[primary]) ||
			TicketOrder.collator.compare(first[secondary], second[secondary]) ||
			TicketOrder.byNumber(first, second)
		);
	}

	private static byNumber(first: QueueGuest, second: QueueGuest): number {
		const [a, b] = [QueueNumber.of(first), QueueNumber.of(second)];

		return a && b ? QueueNumber.compare(a, b) : Number(a === null) - Number(b === null);
	}
}
