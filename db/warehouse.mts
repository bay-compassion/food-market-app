import { drizzle } from 'drizzle-orm/netlify-db';

import * as schema from './warehouse-schema.mjs';

export type WarehouseDb = ReturnType<typeof connectWarehouse>;

function connectWarehouse(connectionString: string) {
	return drizzle(connectionString, { schema });
}

/**
 * The warehouse client, or null when `WAREHOUSE_DB_URL` is not set — which is every environment
 * until a human has created the warehouse project and its writer role. Callers treat null as
 * "warehousing is off", not as an error, so merging the routine deploys nothing that can fail.
 */
export function warehouseDb(env: NodeJS.ProcessEnv = process.env): WarehouseDb | null {
	const connectionString = env['WAREHOUSE_DB_URL'];

	return connectionString ? connectWarehouse(connectionString) : null;
}
