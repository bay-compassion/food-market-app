import { asc, desc, eq, inArray, sql } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { guests, lotteryOddsChanges, marketEvents, visits } from '../../db/schema.mjs';
import { AutomaticOddsRule } from '../../src/models/automatic-odds-rule.js';
import { DrawEntry, type DrawEntryVisit } from '../../src/models/draw-entry.js';
import { DrawLedger } from '../../src/models/draw-ledger.js';
import { GuestReconciliation, type GuestIdentity } from '../../src/models/guest-reconciliation.js';
import { StandingOdds, type OddsChange } from '../../src/models/standing-odds.js';
import type {
	OddsChangeSubmission,
	OddsScope,
	StewardChange,
	StewardLedgerResponse,
	StewardPerson,
	StewardTier,
} from '../../src/services/steward-api.js';
import { tracedQuery } from '../lib/sentry.mjs';
import {
	hasDrawEventSql,
	hasHistorySql,
	readDrawLedger,
	readGuestIdentities,
} from './draw-ledger.mjs';

type ChangeRow = OddsChange & {
	id: string;
	guestId: string;
	previousWeight: number;
	reason: string;
	note: string | null;
	actorName: string | null;
};

type VisitRow = DrawEntryVisit & {
	marketEventId: string;
	guestId: string;
	lotteryWeight: number;
	suggestedLotteryWeight: number | null;
	householdSize: number;
};

type EventRow = {
	id: string;
	status: string;
	registrationOpensAt: Date;
	capacity: number;
};

export type StewardLedgerInput = {
	identities: GuestIdentity[];
	/** Each guest record's own phone and age, newest last. */
	records: { guestId: string; phone: string; createdAt: Date }[];
	ledger: DrawLedger;
	reconciliation: GuestReconciliation;
	events: EventRow[];
	upcoming: EventRow | null;
	visits: VisitRow[];
	changes: ChangeRow[];
	now: Date;
};

function scopeOf(change: Pick<OddsChange, 'marketEventId' | 'endsAt'>): OddsScope {
	if (change.marketEventId) {
		return 'next';
	}

	return change.endsAt ? 'weeks' : 'open';
}

function tiers(weights: readonly number[], placed: readonly boolean[] = []): StewardTier[] {
	const byWeight = new Map<number, StewardTier>();

	weights.forEach((weight, index) => {
		const tier = byWeight.get(weight) ?? { weight, entries: 0, placed: 0 };

		tier.entries += 1;
		tier.placed += placed[index] ? 1 : 0;
		byWeight.set(weight, tier);
	});

	return [...byWeight.values()].sort((a, b) => a.weight - b.weight);
}

/**
 * Everything the steward screens read, in one response. A steward's browser derives temperature and
 * patterns from it. It carries only the last 4 digits of a phone number, a guest's name, and their
 * household size: enough to recognize someone, and no more of their record than this job needs.
 */
export function buildStewardLedger(input: StewardLedgerInput): StewardLedgerResponse {
	const { ledger, reconciliation, records, changes, upcoming, now } = input;
	const identities = new Map(input.identities.map((identity) => [identity.guestId, identity]));
	const recordsByPerson = new Map<string, typeof records>();

	for (const record of records) {
		const person = reconciliation.personOf(record.guestId);

		recordsByPerson.set(person, [...(recordsByPerson.get(person) ?? []), record]);
	}

	const changesByPerson = new Map<string, ChangeRow[]>();

	for (const change of changes) {
		const person = reconciliation.personOf(change.guestId);

		changesByPerson.set(person, [...(changesByPerson.get(person) ?? []), change]);
	}

	const next = upcoming
		? { id: upcoming.id, registrationOpensAt: upcoming.registrationOpensAt }
		: { id: null, registrationOpensAt: now };
	const upcomingVisits = input.visits.filter(
		({ marketEventId, status }) => marketEventId === upcoming?.id && status === 'registered',
	);
	const householdByPerson = new Map<string, number>();

	for (const { guestId, householdSize } of input.visits) {
		householdByPerson.set(reconciliation.personOf(guestId), householdSize);
	}

	const visitWeightByPerson = new Map(
		upcomingVisits.map(({ guestId, lotteryWeight }) => [
			reconciliation.personOf(guestId),
			lotteryWeight,
		]),
	);
	const entrantPersons = new Set(
		upcomingVisits.map(({ guestId }) => reconciliation.personOf(guestId)),
	);
	const anchorOf = (person: string) => recordsByPerson.get(person)?.at(-1);
	const peopleIds = new Set([...ledger.people, ...changesByPerson.keys(), ...entrantPersons]);
	const people: StewardPerson[] = [...peopleIds].flatMap((person) => {
		const anchor = anchorOf(person);
		const identity = anchor && identities.get(anchor.guestId);

		if (!anchor || !identity) {
			return [];
		}

		const setting = new StandingOdds(changesByPerson.get(person) ?? []).changeFor(next);

		return [
			{
				id: anchor.guestId,
				name: `${identity.firstName} ${identity.lastName}`.trim(),
				phoneLast4: anchor.phone.slice(-4),
				householdSize: householdByPerson.get(person) ?? null,
				records: recordsByPerson.get(person)?.length ?? 1,
				outcomes: [...ledger.recordOf(person).outcomes],
				// A guest raised when added by hand holds that on the visit, with no saved change.
				weight: setting?.weight ?? visitWeightByPerson.get(person) ?? 1,
				setting: setting && {
					weight: setting.weight,
					scope: scopeOf(setting),
					endsAt: setting.endsAt?.toISOString() ?? null,
					reason: setting.reason,
					actorName: setting.actorName,
					createdAt: setting.createdAt.toISOString(),
				},
			},
		];
	});
	const rule = new AutomaticOddsRule();
	const upcomingWeights = upcomingVisits.map(({ guestId, lotteryWeight }) => {
		const person = reconciliation.personOf(guestId);

		return new StandingOdds(changesByPerson.get(person) ?? []).weightFor(next) ?? lotteryWeight;
	});
	const changeLog: StewardChange[] = [...changes]
		.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
		.map((change) => {
			const person = reconciliation.personOf(change.guestId);
			const identity = identities.get(anchorOf(person)?.guestId ?? change.guestId);

			return {
				id: change.id,
				personId: anchorOf(person)?.guestId ?? change.guestId,
				guestName: identity ? `${identity.firstName} ${identity.lastName}`.trim() : '',
				previousWeight: change.previousWeight,
				weight: change.weight,
				scope: scopeOf(change),
				endsAt: change.endsAt?.toISOString() ?? null,
				reason: change.reason,
				note: change.note,
				actorName: change.actorName,
				createdAt: change.createdAt.toISOString(),
			};
		});

	return {
		draws: ledger.draws.map(({ id, opensAt }) => {
			const entered = input.visits.filter(
				(visit) => visit.marketEventId === id && new DrawEntry(visit).entered,
			);
			const event = input.events.find((candidate) => candidate.id === id);

			return {
				id,
				opensAt: opensAt.toISOString(),
				spots: event?.capacity ?? 0,
				tiers: tiers(
					entered.map(({ lotteryWeight }) => lotteryWeight),
					entered.map(({ status }) => status !== 'not_placed'),
				),
				suggestedTiers: tiers(
					entered.flatMap(({ suggestedLotteryWeight }) =>
						suggestedLotteryWeight === null ? [] : [suggestedLotteryWeight],
					),
				),
			};
		}),
		upcoming: upcoming && {
			id: upcoming.id,
			status: upcoming.status,
			opensAt: upcoming.registrationOpensAt.toISOString(),
			spots: Math.max(
				0,
				upcoming.capacity -
					input.visits.filter(
						({ marketEventId, status }) => marketEventId === upcoming.id && status === 'waiting',
					).length,
			),
			tiers: tiers(upcomingWeights),
			suggestedTiers: tiers(
				upcomingVisits.map(({ guestId }) =>
					rule.weightFor(ledger.recordOf(reconciliation.personOf(guestId)).missedInARow),
				),
			),
			entrants: [...entrantPersons].flatMap((person) => anchorOf(person)?.guestId ?? []),
		},
		people,
		changes: changeLog,
	};
}

const undrawnStatuses = [
	'scheduled',
	'registration_open',
	'registration_closed',
	'lottery_pending',
];

async function readUpcomingEvent(): Promise<EventRow | null> {
	const [event] = await db
		.select({
			id: marketEvents.id,
			status: marketEvents.status,
			registrationOpensAt: marketEvents.registrationOpensAt,
			capacity: marketEvents.capacity,
		})
		.from(marketEvents)
		.where(inArray(marketEvents.status, undrawnStatuses as never[]))
		.orderBy(asc(marketEvents.registrationOpensAt))
		.limit(1);

	return event ?? null;
}

export async function readStewardLedger(now = new Date()): Promise<StewardLedgerResponse> {
	return tracedQuery('steward.read_ledger', async () => {
		const identities = await readGuestIdentities(db);
		const reconciliation = new GuestReconciliation(identities);
		const [ledger, upcoming, records, changes] = await Promise.all([
			readDrawLedger(db, reconciliation),
			readUpcomingEvent(),
			db
				.select({
					guestId: guests.id,
					phone: guests.normalizedPhone,
					createdAt: guests.createdAt,
				})
				.from(guests)
				.orderBy(asc(guests.createdAt)),
			db
				.select({
					id: lotteryOddsChanges.id,
					guestId: lotteryOddsChanges.guestId,
					previousWeight: lotteryOddsChanges.previousWeight,
					weight: lotteryOddsChanges.weight,
					marketEventId: lotteryOddsChanges.marketEventId,
					endsAt: lotteryOddsChanges.endsAt,
					reason: lotteryOddsChanges.reason,
					note: lotteryOddsChanges.note,
					actorName: lotteryOddsChanges.actorName,
					createdAt: lotteryOddsChanges.createdAt,
				})
				.from(lotteryOddsChanges),
		]);
		const eventIds = [...ledger.draws.map(({ id }) => id), ...(upcoming ? [upcoming.id] : [])];
		const [events, visitRows] =
			eventIds.length === 0
				? [[], []]
				: await Promise.all([
						db
							.select({
								id: marketEvents.id,
								status: marketEvents.status,
								registrationOpensAt: marketEvents.registrationOpensAt,
								capacity: marketEvents.capacity,
							})
							.from(marketEvents)
							.where(inArray(marketEvents.id, eventIds)),
						db
							.select({
								marketEventId: visits.marketEventId,
								guestId: visits.guestId,
								status: visits.status,
								source: visits.source,
								queuePosition: visits.queuePosition,
								hasDrawEvent: hasDrawEventSql,
								hasHistory: hasHistorySql,
								lotteryWeight: visits.lotteryWeight,
								suggestedLotteryWeight: visits.suggestedLotteryWeight,
								householdSize: visits.householdSize,
							})
							.from(visits)
							.where(inArray(visits.marketEventId, eventIds))
							.orderBy(asc(visits.createdAt)),
					]);

		return buildStewardLedger({
			identities,
			reconciliation,
			records,
			ledger,
			events,
			upcoming,
			visits: visitRows,
			changes,
			now,
		});
	});
}

export type OddsChangeResult =
	| { ok: true; id: string; previousWeight: number }
	| { ok: false; status: 404 | 409; error: string };

/** "Next 8 Saturdays" from today: eight weeks of draws. */
const standingWeeks = 8;

/** Saves a steward's change, append-only. The draw reads it when it next runs. */
export async function saveOddsChange(
	guestId: string,
	submission: OddsChangeSubmission,
	actor: { id: string | null; name: string | null },
	now = new Date(),
): Promise<OddsChangeResult> {
	return tracedQuery('steward.save_odds', async () => {
		const [guest] = await db
			.select({ id: guests.id })
			.from(guests)
			.where(eq(guests.id, guestId))
			.limit(1);

		if (!guest) {
			return { ok: false, status: 404, error: 'Guest not found.' };
		}

		const upcoming = await readUpcomingEvent();

		if (submission.scope === 'next' && !upcoming) {
			return { ok: false, status: 409, error: 'No draw is scheduled to apply this to.' };
		}

		const reconciliation = new GuestReconciliation(await readGuestIdentities(db));
		const person = reconciliation.personOf(guestId);
		const existing = await db
			.select({
				guestId: lotteryOddsChanges.guestId,
				weight: lotteryOddsChanges.weight,
				marketEventId: lotteryOddsChanges.marketEventId,
				endsAt: lotteryOddsChanges.endsAt,
				createdAt: lotteryOddsChanges.createdAt,
			})
			.from(lotteryOddsChanges)
			.orderBy(desc(sql`${lotteryOddsChanges.createdAt}`));
		const previousWeight =
			new StandingOdds(
				existing.filter((change) => reconciliation.personOf(change.guestId) === person),
			).weightFor(
				upcoming
					? { id: upcoming.id, registrationOpensAt: upcoming.registrationOpensAt }
					: { id: null, registrationOpensAt: now },
			) ?? 1;
		const [saved] = await db
			.insert(lotteryOddsChanges)
			.values({
				guestId,
				previousWeight,
				weight: submission.weight,
				marketEventId: submission.scope === 'next' ? (upcoming?.id ?? null) : null,
				endsAt:
					submission.scope === 'weeks'
						? new Date(now.getTime() + standingWeeks * 7 * 24 * 60 * 60 * 1000)
						: null,
				reason: submission.reason,
				note: submission.note?.trim() || null,
				actorId: actor.id,
				actorName: actor.name,
			})
			.returning({ id: lotteryOddsChanges.id });

		return { ok: true, id: saved?.id ?? '', previousWeight };
	});
}
