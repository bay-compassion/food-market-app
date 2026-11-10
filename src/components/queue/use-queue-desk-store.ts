import { useEffect, useState } from 'react';

import { QueueDeskStore } from '../../stores/queue-desk.store';
import { useRootStore } from '../../stores/react/store-context';

/**
 * A queue desk for as long as the screen that calls this is mounted, polling the line, or `null`
 * on the first render before it exists.
 *
 * Built in the effect rather than in state, so each mount gets a desk of its own: a disposed desk
 * has stopped watching the open ticket's history for good, and React's strict mode disposes every
 * effect once in development before running it again.
 *
 * The worker's token and permissions have to be wired into the root store first — the desk reads
 * them as it starts — so a screen that sets them does so in an effect declared before this hook.
 */
export function useQueueDeskStore(): QueueDeskStore | null {
	const rootStore = useRootStore();
	const [desk, setDesk] = useState<QueueDeskStore | null>(null);

	useEffect(() => {
		const next = new QueueDeskStore(rootStore.admin, rootStore.session, {
			notifications: rootStore.notifications,
		});

		setDesk(next);
		void next.start();

		return () => next[Symbol.dispose]();
	}, [rootStore]);

	return desk;
}
