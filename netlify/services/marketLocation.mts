import { asc, eq } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { marketLocations } from '../../db/schema.mjs';
import { MarketLocation } from '../../src/models/market-location.js';
import { tracedQuery } from '../lib/sentry.mjs';

type Executor = Pick<typeof db, 'select'>;

/**
 * The location every operation uses. There is exactly one for now; when a second arrives, callers
 * will name the location instead of asking for this one.
 */
export async function currentLocation(executor: Executor = db): Promise<MarketLocation> {
	const [row] = await tracedQuery('market_location.current', () =>
		executor.select().from(marketLocations).orderBy(asc(marketLocations.createdAt)).limit(1),
	);

	if (!row) {
		throw new Error('No market location is configured.');
	}

	return new MarketLocation(row);
}

/** A location by id. */
export async function locationById(executor: Executor, id: string): Promise<MarketLocation> {
	const [row] = await tracedQuery('market_location.by_id', () =>
		executor.select().from(marketLocations).where(eq(marketLocations.id, id)).limit(1),
	);

	if (!row) {
		throw new Error(`Market location ${id} does not exist.`);
	}

	return new MarketLocation(row);
}
