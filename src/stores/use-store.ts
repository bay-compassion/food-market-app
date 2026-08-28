import { inject } from 'vue';

import { type RootStore, rootStoreKey } from './root.store.ts';

export function useStore(): RootStore {
	const store = inject(rootStoreKey);

	if (!store) {
		throw new Error('Root store is not provided');
	}

	return store;
}
