import { z } from 'zod';

/** ISO strings as the admin console sends them; a `Date` passes straight through for server callers. */
export const timestampSchema = z.union([z.string(), z.date()]).pipe(z.coerce.date());

/** Matches the `market_events_capacity_check` constraint in the database. */
export const capacitySchema = z.coerce.number().int().min(1).max(10_000);
