import { createContext, useContext, type ReactNode } from 'react';

import type { QueueDeskStore } from '../../stores/queue-desk.store';
import { TicketListProvider } from './ticket-list-context';

const QueueDeskContext = createContext<QueueDeskStore | null>(null);

/**
 * Puts the `/queue` screen's store within reach of every component on that screen — as the queue
 * desk, and as the ticket list the shared ticket components read.
 */
export function QueueDeskProvider({
	value,
	children,
}: {
	/** `null` while the store is still being made, which the screen's parts must not reach for. */
	value: QueueDeskStore | null;
	children: ReactNode;
}) {
	return (
		<QueueDeskContext.Provider value={value}>
			<TicketListProvider value={value}>{children}</TicketListProvider>
		</QueueDeskContext.Provider>
	);
}

/**
 * The `/queue` screen's store. It lives as long as the screen does, so it is not on the root store;
 * this is how the screen's parts reach it without each one being handed it. Like `useRootStore()`,
 * it throws without a provider rather than quietly building a second store.
 */
export function useQueueDesk(): QueueDeskStore {
	const store = useContext(QueueDeskContext);

	if (!store) {
		throw new Error('Queue desk store is not provided');
	}

	return store;
}
