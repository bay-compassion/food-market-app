import { describe, expect, it } from 'vitest';

import { GuestReconciliation } from './guest-reconciliation';
import { PeriodReach, type ServedVisit } from './period-reach';

const march = {
	start: new Date('2026-03-01T08:00:00.000Z'),
	end: new Date('2026-04-01T07:00:00.000Z'),
};
const firstSession = new Date('2026-03-07T18:30:00.000Z');
const secondSession = new Date('2026-03-14T17:30:00.000Z');

function visit(guestId: string, opensAt: Date, overrides: Partial<ServedVisit> = {}): ServedVisit {
	return {
		guestId,
		marketEventId: opensAt.toISOString(),
		sessionOpensAt: opensAt,
		ageRange: '30-44',
		householdSize: 3,
		childrenCount: 1,
		seniorsCount: 0,
		locale: 'en',
		...overrides,
	};
}

// A parent registered at the desk and later from their phone, and an adult child sharing the phone.
const reconciliation = new GuestReconciliation([
	{ guestId: 'desk', firstName: 'Ana', lastName: 'López', phones: ['9255550100'] },
	{ guestId: 'phone', firstName: 'Ana', lastName: 'Lopez', phones: ['9255550100'] },
	{ guestId: 'child', firstName: 'Luis', lastName: 'López', phones: ['9255550100'] },
	{ guestId: 'other', firstName: 'Mai', lastName: 'Tran', phones: ['4155550111'] },
]);

describe('PeriodReach', () => {
	it('counts a person once across their records and a household once across its people', () => {
		// Arrange
		const visits = [
			visit('desk', firstSession),
			visit('phone', secondSession, { householdSize: 4, childrenCount: 2 }),
			visit('child', secondSession, { ageRange: '18-29', householdSize: 4, childrenCount: 2 }),
			visit('other', secondSession, { householdSize: 1, childrenCount: 0, locale: 'vi' }),
		];

		// Act
		const { totals } = new PeriodReach(visits, reconciliation, new Map(), march);

		// Assert
		expect(totals).toMatchObject({
			sessions: 2,
			visitsServed: 4,
			uniquePeople: 3,
			uniqueHouseholds: 2,
			householdMembers: 5,
			children: 2,
		});
	});

	it('describes each person by their latest visit in the period', () => {
		// Arrange
		const visits = [
			visit('desk', firstSession, { ageRange: null, locale: 'es' }),
			visit('phone', secondSession, { ageRange: '45-59', householdSize: 6, locale: 'es' }),
		];

		// Act
		const { composition } = new PeriodReach(visits, reconciliation, new Map(), march);

		// Assert
		expect(composition).toEqual([
			{ category: 'age', value: '45-59', people: 1 },
			{ category: 'household', value: '6+', people: 1 },
			{ category: 'language', value: 'es', people: 1 },
			{ category: 'race-ethnicity', value: 'not_asked', people: 1 },
		]);
	});

	it("takes a person's latest race and ethnicity answer on any of their records", () => {
		// Arrange: the phone record was used most recently, but the desk record holds the newer answer.
		const visits = [visit('desk', firstSession), visit('phone', secondSession)];
		const answers = new Map([
			['phone', { codes: ['asian'], answeredAt: new Date('2026-01-01T00:00:00.000Z') }],
			[
				'desk',
				{ codes: ['asian', 'hispanic_latino'], answeredAt: new Date('2026-02-01T00:00:00.000Z') },
			],
		]);

		// Act
		const { composition } = new PeriodReach(visits, reconciliation, new Map(), march, answers);

		// Assert
		expect(composition.filter((row) => row.category === 'race-ethnicity')).toEqual([
			{ category: 'race-ethnicity', value: 'asian', people: 1 },
			{ category: 'race-ethnicity', value: 'hispanic_latino', people: 1 },
			{ category: 'race-ethnicity', value: 'multiple', people: 1 },
		]);
	});

	it('finds an answer on a record the person was not served with', () => {
		// Arrange: only the worker-added desk record was served; the guest answered on their phone.
		const visits = [visit('desk', firstSession)];
		const answers = new Map([
			['phone', { codes: ['prefer_not_to_answer'], answeredAt: firstSession }],
		]);

		// Act
		const { composition } = new PeriodReach(visits, reconciliation, new Map(), march, answers);

		// Assert
		expect(composition).toContainEqual({
			category: 'race-ethnicity',
			value: 'prefer_not_to_answer',
			people: 1,
		});
	});

	it('counts a person as first-time only when no record of theirs was served earlier', () => {
		// Arrange: the desk record was served in February, so the phone record is not a first visit.
		const visits = [visit('phone', firstSession), visit('other', firstSession)];
		const firstServed = new Map([
			['desk', new Date('2026-02-14T18:30:00.000Z')],
			['phone', firstSession],
			['other', firstSession],
		]);

		// Act
		const { totals } = new PeriodReach(visits, reconciliation, firstServed, march);

		// Assert
		expect(totals.firstTimePeople).toBe(1);
	});
});
