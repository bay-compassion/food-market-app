import type { Config } from '@netlify/functions';

import { db } from '../../db/index.mjs';
import { warehouseDb } from '../../db/warehouse.mjs';
import { getLogger, loggedJob } from '../lib/logging.mjs';
import { WarehouseSnapshotter } from '../services/warehouse-snapshot.mjs';

/**
 * Once a day, freezes every session and period that has settled into the long-term warehouse.
 * Does nothing until `WAREHOUSE_DB_URL` is set. See `docs/data-warehousing.md`.
 */
export async function snapshotWarehouse(env: NodeJS.ProcessEnv = process.env, now = new Date()) {
	const warehouse = warehouseDb(env);

	if (!warehouse) {
		getLogger().info({ message: 'warehouse.disabled' });

		return;
	}

	const { written, remaining } = await new WarehouseSnapshotter(db, warehouse, now).run();

	getLogger().info({ message: 'warehouse.run', written, remaining });
}

export default loggedJob('warehouse-snapshot', () => snapshotWarehouse());

export const config: Config = {
	schedule: '@daily',
};
