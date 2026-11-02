import { desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';

import type { db as appDatabase } from '../../db/index.mjs';
import { guests, marketEvents, visitEvents, visits } from '../../db/schema.mjs';
import { DrawEntry } from '../../src/models/draw-entry.js';
import { DrawLedger, type LedgerEntry } from '../../src/models/draw-ledger.js';
import { GuestReconciliation, type GuestIdentity } from '../../src/models/guest-reconciliation.js';

type Database = typeof appDatabase;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
export type Reader = Database | Transaction;

/** Whether a visit's history records the draw drawing it or passing it over. */
export const hasDrawEventSql = sql<boolean>`exists (
	select 1 from ${visitEvents}
	where ${visitEvents.visitId} = ${visits.id}
		and ${visitEvents.kind} in ('drawn', 'not_drawn')
)`;

/** Whether a visit has any history at all. Visits older than the history have none. */
export const hasHistorySql = sql<boolean>`exists (
	select 1 from ${visitEvents} where ${visitEvents.visitId} = ${visits.id}
)`;

/** How far back a person's record reaches: the Saturdays the steward screens show. */
export const ledgerDrawCount = 12;

/** Every guest record with each phone it has used, which is what matching people runs on. */
export async function readGuestIdentities(
	database: Reader,
	{ realOnly = false }: { realOnly?: boolean } = {},
): Promise<GuestIdentity[]> {
	const [records, visitPhones] = await Promise.all([
		database
			.select({
				guestId: guests.id,
				firstName: guests.firstName,
				lastName: guests.lastName,
				phone: guests.normalizedPhone,
			})
			.from(guests)
			.where(realOnly ? eq(guests.fake, false) : undefined),
		database
			.selectDistinct({ guestId: visits.guestId, phone: visits.normalizedPhone })
			.from(visits)
			.where(isNotNull(visits.normalizedPhone)),
	]);
	const identities = new Map(
		records.map((record) => [
			record.guestId,
			{
				guestId: record.guestId,
				firstName: record.firstName,
				lastName: record.lastName,
				phones: record.phone ? [record.phone] : [],
			},
		]),
	);

	for (const { guestId, phone } of visitPhones) {
		if (phone) {
			identities.get(guestId)?.phones.push(phone);
		}
	}

	return [...identities.values()];
}

/** The draws already run, newest last, with who went through them as people, not records. */
export async function readDrawLedger(
	database: Reader,
	reconciliation: GuestReconciliation,
): Promise<DrawLedger> {
	const newestFirst = await database
		.select({ id: marketEvents.id, opensAt: marketEvents.registrationOpensAt })
		.from(marketEvents)
		.where(inArray(marketEvents.status, ['service_started', 'ended']))
		.orderBy(desc(marketEvents.registrationOpensAt))
		.limit(ledgerDrawCount);

	if (newestFirst.length === 0) {
		return new DrawLedger([], []);
	}

	const rows = await database
		.select({
			drawId: visits.marketEventId,
			guestId: visits.guestId,
			status: visits.status,
			source: visits.source,
			queuePosition: visits.queuePosition,
			hasDrawEvent: hasDrawEventSql,
			hasHistory: hasHistorySql,
		})
		.from(visits)
		.where(
			inArray(
				visits.marketEventId,
				newestFirst.map(({ id }) => id),
			),
		);
	const entries: LedgerEntry[] = rows.flatMap((row) => {
		const entry = new DrawEntry(row);

		return entry.entered
			? [
					{
						drawId: row.drawId,
						personId: reconciliation.personOf(row.guestId),
						won: entry.won,
					},
				]
			: [];
	});

	return new DrawLedger([...newestFirst].reverse(), entries);
}
