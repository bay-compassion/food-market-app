import { randomBytes } from 'node:crypto';

import { and, eq, isNull } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { premarketCodes } from '../../db/schema.mjs';
import { PremarketWindow } from '../../src/models/premarket-window.js';
import { tracedQuery } from '../lib/sentry.mjs';
import { locationById } from './marketLocation.mjs';
import { getCurrentEvent } from './marketSession.mjs';

/** A location's live premarket code, as a steward sees it to print the poster. */
export type PremarketCode = {
	code: string;
	createdAt: string;
	createdByName: string | null;
};

/** Where a scanned code leads: the session whose premarket it opens, and whether it is open now. */
export type PremarketSession = { marketEventId: string; open: boolean };

/** 128 bits: printed and posted, but never guessable from outside. */
function newCode() {
	return randomBytes(16).toString('base64url');
}

function toPremarketCode(row: typeof premarketCodes.$inferSelect): PremarketCode {
	return {
		code: row.code,
		createdAt: row.createdAt.toISOString(),
		createdByName: row.createdByName,
	};
}

/** The code a location's poster carries now, or `null` when none has been made yet. */
export async function liveCodeAt(locationId: string): Promise<PremarketCode | null> {
	const [row] = await tracedQuery('premarket_code.live', () =>
		db
			.select()
			.from(premarketCodes)
			.where(and(eq(premarketCodes.locationId, locationId), isNull(premarketCodes.replacedAt)))
			.limit(1),
	);

	return row ? toPremarketCode(row) : null;
}

/**
 * Makes a location's code, retiring the one before it: every poster printed from the old code stops
 * working at once. The old row is kept, marked replaced, so who replaced it and when stays on record.
 */
export async function replaceCode(
	locationId: string,
	by: { id: string | null; name: string | null },
	now = new Date(),
): Promise<PremarketCode> {
	const row = await tracedQuery('premarket_code.replace', () =>
		db.transaction(async (tx) => {
			await tx
				.update(premarketCodes)
				.set({ replacedAt: now })
				.where(and(eq(premarketCodes.locationId, locationId), isNull(premarketCodes.replacedAt)));

			const [created] = await tx
				.insert(premarketCodes)
				.values({
					locationId,
					code: newCode(),
					createdById: by.id,
					createdByName: by.name,
					createdAt: now,
				})
				.returning();

			return created!;
		}),
	);

	return toPremarketCode(row);
}

/**
 * The session a scanned code opens the premarket of, or `null` for a code that is unknown, replaced,
 * or belongs to a location with no session coming up. Unknown and replaced codes answer the same, so
 * the answer reveals nothing about which codes once existed.
 */
export async function premarketSessionFor(
	code: string,
	now = new Date(),
): Promise<PremarketSession | null> {
	const [row] = await tracedQuery('premarket_code.lookup', () =>
		db
			.select({ locationId: premarketCodes.locationId })
			.from(premarketCodes)
			.where(and(eq(premarketCodes.code, code), isNull(premarketCodes.replacedAt)))
			.limit(1),
	);

	if (!row) {
		return null;
	}

	const event = await getCurrentEvent();

	if (!event || event.locationId !== row.locationId) {
		return null;
	}

	const location = await locationById(db, row.locationId);

	return { marketEventId: event.id, open: new PremarketWindow(event, location).isOpenAt(now) };
}
