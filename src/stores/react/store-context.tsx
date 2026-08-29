import { createContext, useContext, type ReactNode } from 'react';

import type { RootStore } from '../root.store.ts';

const RootStoreContext = createContext<RootStore | null>(null);

/**
 * Makes the application store available to the React tree.
 *
 * The app has one store, created at bootstrap. During the migration it is Vue that owns it, so
 * `reactIsland` reads it out of Vue's injection and provides it here; once `App.vue` is React
 * this provider moves to the root and the island goes away with the rest of the bridge.
 */
export function RootStoreProvider({
	store,
	children,
}: {
	store: RootStore | null;
	children: ReactNode;
}) {
	return <RootStoreContext.Provider value={store}>{children}</RootStoreContext.Provider>;
}

/**
 * The application store.
 *
 * This throws rather than falling back to a fresh `RootStore` the way Vue's `useRootStore()` does.
 * A per-call fallback hands each component its own store, so two components in the same tree stop
 * agreeing — which reads as a component that simply does not react. A missing provider is a wiring
 * mistake, and it is worth failing loudly on.
 *
 * A component reading this must be wrapped in `observer()`, or it will render once against the
 * store and never again.
 */
export function useRootStore(): RootStore {
	const store = useContext(RootStoreContext);

	if (!store) {
		throw new Error('Root store is not provided');
	}

	return store;
}
