import { describe, expect, it, vi } from 'vitest';

import { DrawLedger } from '../../src/models/draw-ledger.js';
import { GuestReconciliation } from '../../src/models/guest-reconciliation.js';
import { db } from '../test/dbStub.mjs';

vi.mock('../../db/index.mjs', () => ({ db }));

import { buildStewardLedger, type StewardLedgerInput } from './steward-ledger.mjs';

const identities = [
	{ guestId: 'old', firstName: 'Ana', lastName: 'Reyes', phones: ['5105550123'] },
	{ guestId: 'new', firstName: 'Ana', lastName: 'Reyes', phones: ['5105550123'] },
	{ guestId: 'bo', firstName: 'Bo', lastName: 'Lee', phones: ['5105550199'] },
];
const reconciliation = new GuestReconciliation(identities);
const ana = reconciliation.personOf('old');
const opensAt = new Date('2026-10-31T17:30:00Z');
const event = { id: 'd1', status: 'ended', registrationOpensAt: opensAt, capacity: 1 };
const upcoming = {
	id: 'd2',
	status: 'registration_open',
	registrationOpensAt: new Date('2026-11-07T17:30:00Z'),
	capacity: 100,
};
const visit = {
	marketEventId: 'd1',
	guestId: 'old',
	status: 'not_placed' as const,
	source: 'self',
	queuePosition: null,
	hasDrawEvent: true,
	hasHistory: true,
	lotteryWeight: 1,
	suggestedLotteryWeight: 1,
	householdSize: 4,
};

function input(overrides: Partial<StewardLedgerInput> = {}): StewardLedgerInput {
	return {
		identities,
		reconciliation,
		records: [
			{ guestId: 'old', phone: '5105550123', createdAt: new Date('2026-01-01') },
			{ guestId: 'new', phone: '5105550123', createdAt: new Date('2026-06-01') },
			{ guestId: 'bo', phone: '5105550199', createdAt: new Date('2026-01-01') },
		],
		ledger: new DrawLedger([{ id: 'd1', opensAt }], [{ drawId: 'd1', personId: ana, won: false }]),
		events: [event],
		upcoming,
		visits: [visit],
		changes: [],
		now: new Date('2026-11-01T00:00:00Z'),
		...overrides,
	};
}

describe('buildStewardLedger', () => {
	it('names a person by their newest record and only the end of their phone', () => {
		// Act
		const { people } = buildStewardLedger(input());

		// Assert
		expect(people).toHaveLength(1);
		expect(people[0]).toMatchObject({
			id: 'new',
			name: 'Ana Reyes',
			phoneLast4: '0123',
			records: 2,
			householdSize: 4,
			weight: 1,
		});
		expect(JSON.stringify(people)).not.toContain('5105550123');
	});

	it('applies a change saved on an older record to the person', () => {
		// Act
		const { people, upcoming: next } = buildStewardLedger(
			input({
				visits: [
					visit,
					{
						...visit,
						marketEventId: 'd2',
						guestId: 'new',
						status: 'registered' as const,
						hasDrawEvent: false,
					},
				],
				changes: [
					{
						id: 'c1',
						guestId: 'old',
						previousWeight: 1,
						weight: 5,
						marketEventId: null,
						endsAt: null,
						reason: 'Staff judgment',
						note: null,
						actorName: 'Dana',
						createdAt: new Date('2026-10-01'),
					},
				],
			}),
		);

		// Assert
		expect(people[0]?.weight).toBe(5);
		expect(people[0]?.setting).toMatchObject({ scope: 'open', actorName: 'Dana' });
		expect(next?.tiers).toEqual([{ weight: 5, entries: 1, placed: 0 }]);
	});

	it('takes people already placed out of the spots left', () => {
		// Act
		const { upcoming: next } = buildStewardLedger(
			input({
				visits: [
					{
						...visit,
						marketEventId: 'd2',
						status: 'waiting' as const,
						queuePosition: 4,
						hasDrawEvent: false,
						source: 'admin',
					},
				],
			}),
		);

		// Assert
		expect(next?.spots).toBe(99);
	});

	it('leaves a guest placed straight into line out of a draw’s tiers', () => {
		// Act
		const { draws } = buildStewardLedger(
			input({
				visits: [
					visit,
					{
						...visit,
						guestId: 'bo',
						status: 'waiting',
						source: 'admin',
						queuePosition: 1,
						hasDrawEvent: false,
					},
				],
			}),
		);

		// Assert
		expect(draws[0]?.tiers).toEqual([{ weight: 1, entries: 1, placed: 0 }]);
	});

	it('shows odds raised on a visit when no change is saved', () => {
		// Act
		const { people } = buildStewardLedger(
			input({
				visits: [
					visit,
					{
						...visit,
						marketEventId: 'd2',
						guestId: 'new',
						status: 'registered',
						hasDrawEvent: false,
						lotteryWeight: 5,
					},
				],
			}),
		);

		// Assert
		expect(people[0]?.weight).toBe(5);
		expect(people[0]?.setting).toBeNull();
	});

	it('flags a draw that ran without settling saved odds', () => {
		// Act
		const { draws } = buildStewardLedger(
			input({
				visits: [{ ...visit, suggestedLotteryWeight: null }],
				changes: [
					{
						id: 'c1',
						guestId: 'old',
						previousWeight: 1,
						weight: 5,
						marketEventId: null,
						endsAt: null,
						reason: 'Staff judgment',
						note: null,
						actorName: 'Dana',
						createdAt: new Date('2026-10-01'),
					},
				],
			}),
		);

		// Assert
		expect(draws[0]?.oddsSkipped).toBe(true);
	});

	it('doesn’t flag an older draw from before anyone saved odds', () => {
		// Act
		const { draws } = buildStewardLedger(
			input({ visits: [{ ...visit, suggestedLotteryWeight: null }] }),
		);

		// Assert
		expect(draws[0]?.oddsSkipped).toBe(false);
	});

	it('reports a past draw by tier', () => {
		// Act
		const { draws } = buildStewardLedger(input());

		// Assert
		expect(draws[0]?.tiers).toEqual([{ weight: 1, entries: 1, placed: 0 }]);
		expect(draws[0]?.spots).toBe(1);
	});
});
