import { useEffect } from 'react';

import { PageVisibilityPoller } from '../../services/page-visibility-poller';
import { useRootStore } from '../../stores/react/store-context';

/** How often a screen showing the station looks again at whether it is checking in. */
const checkIntervalMs = 15_000;

/**
 * Keeps `admin.printStationOnline` current while the calling screen is shown, pausing while the
 * page is hidden.
 */
export function usePrintStationCheck(): void {
	const { admin } = useRootStore();

	useEffect(() => {
		const poller = new PageVisibilityPoller(
			() => void admin.checkPrintStation(),
			checkIntervalMs,
			() => {},
		);

		poller.start();

		return () => poller.stop();
	}, [admin]);
}
