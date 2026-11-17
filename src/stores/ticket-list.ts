import type { QueueGuest } from '../services/admin-api.ts';
import type { VisitEvent } from '../services/visit-events.ts';

/**
 * A screen that lists guests as tickets in folding sections and opens one at a time, beside the
 * list on a desk or in a sheet on a phone. The queue desk is one; an ended session's participants
 * are another. The list, its tickets, the open ticket's pane or sheet, and its history read only
 * this, so both screens share them.
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
}
