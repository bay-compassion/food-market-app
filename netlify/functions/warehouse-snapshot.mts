import type { Config } from '@netlify/functions';

import { db } from '../../db/index.mjs';
import { getLogger, loggedJob } from '../lib/logging.mjs';
import { WarehouseSnapshotter } from '../services/warehouse-snapshot.mjs';

/**
 * Snapshots are append-only, so the first one is a commitment to the counting rules. They start
 * only once someone turns them on, not the moment this merges.
 */
export function warehouseSnapshotsEnabled(env: NodeJS.ProcessEnv = process.env) {
	return env['ENABLE_WAREHOUSE_SNAPSHOTS']?.trim().toLowerCase() === 'true';
}

/**
 * Once a day, freezes every session and period that has settled into the `warehouse` schema. See
 * `docs/data-warehousing.md`.
 */
export async function snapshotWarehouse(env: NodeJS.ProcessEnv = process.env, now = new Date()) {
	if (!warehouseSnapshotsEnabled(env)) {
		getLogger().info({ message: 'warehouse.disabled' });

		return;
	}

	const { written, remaining } = await new WarehouseSnapshotter(db, now).run();

	getLogger().info({ message: 'warehouse.run', written, remaining });
}

export default loggedJob('warehouse-snapshot', () => snapshotWarehouse());

export const config: Config = {
	schedule: '@daily',
};
