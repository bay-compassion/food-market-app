import { sql } from 'drizzle-orm';

import { lotteryOddsChanges, visits } from '../../db/schema.mjs';
import { AutomaticOddsRule } from '../../src/models/automatic-odds-rule.js';
import { GuestReconciliation } from '../../src/models/guest-reconciliation.js';
import { StandingOdds, type OddsChange } from '../../src/models/standing-odds.js';
import { readDrawLedger, readGuestIdentities, type Reader } from './draw-ledger.mjs';

export type DrawRegistration = { id: string; guestId: string; lotteryWeight: number };

/**
 * Settles each entry's odds as the draw starts, inside its transaction, so a steward's change counts
 * right up to the draw and a guest registering never reads or sets a weight.
 *
 * A saved change beats whatever the visit holds. Saved changes follow the person, so a new browser
 * or a worker-added visit, which each create a new guest record, keep them. The visit keeps the
 * weight the draw used. The automatic rule is only recorded beside it, and nothing here reads that
 * back.
 */
export async function settleDrawOdds(
	tx: Reader,
	draw: { id: string; registrationOpensAt: Date },
	registrations: DrawRegistration[],
): Promise<DrawRegistration[]> {
	if (registrations.length === 0) {
		return registrations;
	}

	const reconciliation = new GuestReconciliation(await readGuestIdentities(tx));
	const [ledger, changes] = await Promise.all([
		readDrawLedger(tx, reconciliation),
		tx
			.select({
				guestId: lotteryOddsChanges.guestId,
				weight: lotteryOddsChanges.weight,
				marketEventId: lotteryOddsChanges.marketEventId,
				endsAt: lotteryOddsChanges.endsAt,
				createdAt: lotteryOddsChanges.createdAt,
			})
			.from(lotteryOddsChanges),
	]);
	const changesByPerson = new Map<string, OddsChange[]>();

	for (const { guestId, ...change } of changes) {
		const person = reconciliation.personOf(guestId);

		changesByPerson.set(person, [...(changesByPerson.get(person) ?? []), change]);
	}

	const rule = new AutomaticOddsRule();
	const settled = registrations.map((registration) => {
		const person = reconciliation.personOf(registration.guestId);
		const saved = new StandingOdds(changesByPerson.get(person) ?? []).weightFor(draw);

		return {
			registration: { ...registration, lotteryWeight: saved ?? registration.lotteryWeight },
			suggested: rule.weightFor(ledger.recordOf(person).missedInARow),
		};
	});
	const values = settled.map(
		({ registration, suggested }) =>
			sql`(${registration.id}::uuid, ${registration.lotteryWeight}::integer, ${suggested}::integer)`,
	);

	await tx.execute(sql`
		UPDATE ${visits} AS visit
		SET lottery_weight = settled.weight, suggested_lottery_weight = settled.suggested
		FROM (VALUES ${sql.join(values, sql`, `)}) AS settled(id, weight, suggested)
		WHERE visit.id = settled.id
	`);

	return settled.map(({ registration }) => registration);
}
