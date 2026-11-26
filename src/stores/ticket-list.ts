import type { QueueSearch } from '../models/queue-search.ts';
import type { TicketOrder, TicketOrderKey } from '../models/ticket-order.ts';
import type { QueueGuest } from '../services/admin-api.ts';
import type { VisitEvent } from '../services/visit-events.ts';

/**
 * A screen that lists guests as tickets in folding sections and opens one at a time, beside the
 * list on a desk or in a sheet on a phone. The queue desk is one; an ended session's participants
 * are another. The list, its tickets, the open ticket's pane or sheet, its history, the search, and
 * the order the list is read in use only this, so both screens share them.
 */
export interface TicketList {
	/** The open ticket's guest, or `null` while none is open. */
	readonly selected: QueueGuest | null;
	/** What has happened to the open ticket's visit, oldest first; `null` until it has loaded. */
	readonly history: readonly VisitEvent[] | null;
	select(guest: QueueGuest): void;
	dismiss(): void;
	isCollapsed(section: string): boolean;
	toggleSection(section: string): void;
	/**
	 * Present while the screen is picking out several tickets at once, so a tap checks a ticket
	 * rather than opening it. Absent on a screen that never does — the queue desk.
	 */
	readonly selection?: TicketSelection | null;

	/** What was typed into the search, and which tickets it finds. */
	readonly search: QueueSearch;
	/** Whether the search dialog is up. */
	readonly isSearching: boolean;
	/**
	 * The tickets the search finds, in sections as the list has them and in the order it shows
	 * them — or none until something is typed.
	 */
	readonly searchResults: readonly TicketSearchResult[];
	setSearchQuery(query: string): void;
	openSearch(): void;
	/** Puts the search away, and what was typed with it, so the next one starts afresh. */
	closeSearch(): void;
	/** Acts on the one ticket the search found, for a volunteer who presses Enter. Else nothing. */
	selectSoleSearchResult(): void;

	/** The order the sections list their tickets in. Display only. */
	readonly order: TicketOrder;
	setOrder(key: TicketOrderKey): void;
}

/** One section's worth of the tickets a search found. */
export interface TicketSearchResult {
	section: string;
	title: string;
	guests: QueueGuest[];
}

/** The tickets picked out on a screen that acts on several at once. */
export interface TicketSelection {
	isChecked(guest: QueueGuest): boolean;
	toggle(guest: QueueGuest): void;
}
