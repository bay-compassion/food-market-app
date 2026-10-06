import { createContext, useContext } from 'react';

import type { PrintStationStore } from '../../stores/print-station.store';

const PrintStationContext = createContext<PrintStationStore | null>(null);

/** Puts the `/printing-station` page's store within reach of every part of that page. */
export const PrintStationProvider = PrintStationContext.Provider;

/** The print station's store. Throws without a provider rather than building a second one. */
export function usePrintStation(): PrintStationStore {
	const store = useContext(PrintStationContext);

	if (!store) {
		throw new Error('Print station store is not provided');
	}

	return store;
}
