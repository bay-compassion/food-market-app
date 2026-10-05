import { createContext, useContext } from 'react';

import type { QueueDeskStore } from '../../stores/queue-desk.store';

const QueueDeskContext = createContext<QueueDeskStore | null>(null);

/** Puts the `/queue` screen's store within reach of every component on that screen. */
export const QueueDeskProvider = QueueDeskContext.Provider;

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
