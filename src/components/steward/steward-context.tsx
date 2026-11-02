import { createContext, useContext, type ReactNode } from 'react';

import type { StewardStore } from '../../stores/steward.store';

const StewardContext = createContext<StewardStore | null>(null);

/** Its own context rather than `RootStore`, so nothing of this area enters the shared downloads. */
export function StewardProvider({ store, children }: { store: StewardStore; children: ReactNode }) {
	return <StewardContext.Provider value={store}>{children}</StewardContext.Provider>;
}

export function useSteward(): StewardStore {
	const store = useContext(StewardContext);

	if (!store) {
		throw new Error('useSteward needs a StewardProvider above it.');
	}

	return store;
}
