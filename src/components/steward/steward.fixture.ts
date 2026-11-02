import type { StewardLedgerResponse, StewardPerson } from '../../services/steward-api';

/** Sample data for stories and tests: 12 Saturdays, and a next draw with people entered. */
const saturdays = Array.from({ length: 12 }, (_, index) => {
	const opensAt = new Date(Date.UTC(2026, 7, 15 + index * 7, 17, 30));

	return `2026-${String(opensAt.getUTCMonth() + 1).padStart(2, '0')}-${String(opensAt.getUTCDate()).padStart(2, '0')}T17:30:00.000Z`;
});
const drawId = (index: number) => `draw-${index}`;

function person(
	id: string,
	name: string,
	phoneLast4: string,
	pattern: string,
	overrides: Partial<StewardPerson> = {},
): StewardPerson {
	return {
		id,
		name,
		phoneLast4,
		householdSize: 3,
		records: 1,
		outcomes: pattern
			.split('')
			.flatMap((mark, index) =>
				mark === '-' ? [] : [{ drawId: drawId(index), chance: 0.5, won: mark === 'w' }],
			),
		weight: 1,
		setting: null,
		...overrides,
	};
}

const setting = (weight: number, actorName: string, reason: string) => ({
	weight,
	scope: 'weeks' as const,
	endsAt: '2026-12-26T00:00:00.000Z',
	reason,
	actorName,
	createdAt: '2026-10-24T18:00:00.000Z',
});

export const stewardFixture: StewardLedgerResponse = {
	draws: saturdays.map((opensAt, index) => ({
		id: drawId(index),
		opensAt,
		spots: 100,
		tiers: [
			{ weight: 1, entries: 180, placed: 86 },
			{ weight: 2, entries: 15, placed: 9 },
			{ weight: 5, entries: 5, placed: 5 },
		],
		suggestedTiers: [
			{ weight: 1, entries: 150, placed: 0 },
			{ weight: 2, entries: 38, placed: 0 },
			{ weight: 3, entries: 12, placed: 0 },
		],
		oddsSkipped: false,
	})),
	upcoming: {
		id: 'draw-next',
		status: 'registration_closed',
		opensAt: '2026-11-07T17:30:00.000Z',
		spots: 100,
		tiers: [
			{ weight: 1, entries: 180, placed: 0 },
			{ weight: 2, entries: 15, placed: 0 },
			{ weight: 5, entries: 5, placed: 0 },
		],
		suggestedTiers: [
			{ weight: 1, entries: 150, placed: 0 },
			{ weight: 2, entries: 38, placed: 0 },
			{ weight: 3, entries: 12, placed: 0 },
		],
		entrants: ['rosa', 'minh', 'lina', 'tomas', 'marcus'],
	},
	people: [
		person('rosa', 'Rosa Delgado', '0125', '---mwwmmmmmm', {
			weight: 2,
			records: 3,
			setting: setting(2, 'Dana R.', 'Repeated misses'),
		}),
		person('minh', 'Minh Tran', '0162', '-----mwmmmmm'),
		person('lina', 'Li Na Chen', '0177', '----mmmwmmmm', {
			weight: 5,
			setting: setting(5, 'Sam P.', 'Correcting an error'),
		}),
		person('tomas', 'Tomas Silva', '0134', '----wmwmwmmw'),
		person('elena', 'Elena Petrova', '0128', '-----wmwmwmw'),
		person('marcus', 'Marcus Lee', '0171', '---wwmwwwmww'),
		person('ngozi', 'Ngozi Eze', '0165', '-wwwwmwwwmww'),
		person('arman', 'Arman Sahakian', '0138', '----------mw'),
	],
	changes: [
		{
			id: 'c2',
			personId: 'lina',
			guestName: 'Li Na Chen',
			previousWeight: 2,
			weight: 5,
			scope: 'weeks',
			endsAt: '2026-12-26T00:00:00.000Z',
			reason: 'Correcting an error',
			note: null,
			actorName: 'Sam P.',
			createdAt: '2026-10-30T18:00:00.000Z',
		},
		{
			id: 'c1',
			personId: 'rosa',
			guestName: 'Rosa Delgado',
			previousWeight: 1,
			weight: 2,
			scope: 'weeks',
			endsAt: '2026-12-19T00:00:00.000Z',
			reason: 'Repeated misses',
			note: null,
			actorName: 'Dana R.',
			createdAt: '2026-10-24T18:00:00.000Z',
		},
	],
};
