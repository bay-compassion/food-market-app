import { useState, type ReactNode } from 'react';

import { AdminApi } from '../../services/admin-api';
import type { Permission } from '../../services/permissions';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
import { NotificationToasts } from '../ui/NotificationToasts';

/** The print station as a story shows it. "Unknown" is a worker who can't run the queue. */
export type StationState = 'online' | 'offline' | 'unknown';

/**
 * A store whose API answers the station check with the chosen state, and takes a test tag while
 * online.
 *
 * Shared by the Checklist's and the Today screen's stories, which show the same station.
 */
export function PrintStationFixture({
	station,
	children,
}: {
	station: StationState;
	children: ReactNode;
}) {
	const [store] = useState(() => {
		// `AdminApi` only ever requests a plain path string.
		const request = (url: string) =>
			Promise.resolve(
				url.endsWith('/print-jobs/test')
					? Response.json({ queued: true }, { status: 202 })
					: Response.json({ online: station === 'online' }),
			);
		const permissions: Permission[] =
			station === 'unknown' ? ['manage:sessions'] : ['manage:sessions', 'run:queue'];
		const created = new RootStore({
			admin: {
				api: new AdminApi({ request: request as typeof fetch }),
				readPermissions: async () => permissions,
			},
		});

		void created.admin.loadPermissions().then(() => created.admin.checkPrintStation());

		return created;
	});

	return (
		<RootStoreProvider store={store}>
			{children}
			{/* The decorator's toasts read the decorator's store, not this one. */}
			<NotificationToasts />
		</RootStoreProvider>
	);
}
