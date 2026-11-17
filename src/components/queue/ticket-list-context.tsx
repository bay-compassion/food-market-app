import { createContext, useContext } from 'react';

import type { TicketList } from '../../stores/ticket-list';

const TicketListContext = createContext<TicketList | null>(null);

/** Puts a screen's ticket list within reach of the shared ticket components. */
export const TicketListProvider = TicketListContext.Provider;

/** The ticket list of the screen this component is on. Throws without a provider. */
export function useTicketList(): TicketList {
	const list = useContext(TicketListContext);

	if (!list) {
		throw new Error('Ticket list is not provided');
	}

	return list;
}
