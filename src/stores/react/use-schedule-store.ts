import { ScheduleApi } from '../../services/schedule-api.ts';
import type { RootStore } from '../root.store.ts';
import { ScheduleStore } from '../schedule.store.ts';
import { useRootStore } from './store-context.tsx';

const stores = new WeakMap<RootStore, ScheduleStore>();

/**
 * The Schedule tab's store, one per root store.
 *
 * It is not a field of `RootStore` because `RootStore` is in the guest's initial download and the
 * schedule's models pull in Luxon. Keying the instance by the root store keeps the guarantee
 * `useRootStore()` exists for — every component in one tree shares the same store — while the
 * store itself loads only with the admin screens. A component reading it must be an `observer()`.
 */
export function useScheduleStore(): ScheduleStore {
	const root = useRootStore();
	let store = stores.get(root);

	if (!store) {
		store = new ScheduleStore(
			new ScheduleApi({ requestHeaders: () => root.requestHeaders() }),
			root.session,
			root.notifications,
		);
		stores.set(root, store);
	}

	return store;
}
