import { describe, expect, it } from 'vitest';

import { GuestProfile, type GuestProfileRecord, type GuestProfileVisit } from './guest-profile';

function visit(overrides: Partial<GuestProfileVisit> = {}): GuestProfileVisit {
	return {
		id: 'visit-1',
		marketEventId: 'event-1',
		visitDate: '2026-11-19',
		status: 'served',
		track: 'lottery',
		queuePosition: 41,
		priorityNumber: null,
		queueFront: false,
		queueOrder: 41,
		householdSize: 4,
		childrenCount: 2,
		seniorsCount: 1,
		ageRange: '30-44',
		source: 'self',
		calledAt: null,
		servedAt: null,
		createdAt: '2026-11-19T17:00:00.000Z',
		...overrides,
	};
}

function profileWith(visits: GuestProfileVisit[]): GuestProfile {
	const record: GuestProfileRecord = {
		guestId: 'guest-1',
		firstName: 'Maria',
		lastName: 'Lopez',
		pronunciation: 'mah-REE-ah',
		phone: '(415) 555-0142',
		locale: 'es',
		createdAt: '2025-03-12T17:00:00.000Z',
		visits,
	};

	return new GuestProfile(record);
}

const history = [
	visit({ id: 'today', marketEventId: 'today', visitDate: '2026-11-26', status: 'called' }),
	visit({ id: 'nov-19' }),
	visit({ id: 'nov-12', marketEventId: 'event-0', visitDate: '2026-11-12', status: 'no_show' }),
	visit({
		id: 'sep-24',
		marketEventId: 'event-sep',
		visitDate: '2026-09-24',
		householdSize: 3,
		childrenCount: 1,
	}),
];

describe('GuestProfile', () => {
	it('counts every visit, those served, and those missed', () => {
		// Arrange
		const profile = profileWith(history);

		// Act
		const counts = [profile.visitCount, profile.servedCount, profile.noShowCount];

		// Assert
		expect(counts).toEqual([4, 2, 1]);
	});

	it('reads the household from the latest visit', () => {
		// Arrange
		const profile = profileWith(history);

		// Act
		const household = profile.household;

		// Assert
		expect(household).toEqual({
			size: 4,
			children: 2,
			seniors: 1,
			ageRange: '30-44',
			asOf: '2026-11-26',
		});
	});

	it('says what the household was before it last changed', () => {
		// Arrange
		const profile = profileWith(history);

		// Act
		const previous = profile.previousHousehold;

		// Assert
		expect(previous).toMatchObject({ size: 3, asOf: '2026-09-24' });
	});

	it('has no earlier household when it never changed, and none at all without a visit', () => {
		// Arrange
		const steady = profileWith([visit(), visit({ id: 'older' })]);
		const unvisited = profileWith([]);

		// Act, Assert
		expect(steady.previousHousehold).toBeNull();
		expect(unvisited.household).toBeNull();
		expect(unvisited.previousHousehold).toBeNull();
	});

	it('finds the visit in the session open now, and lists the others as past', () => {
		// Arrange
		const profile = profileWith(history);

		// Act
		const today = profile.visitIn('today');
		const past = profile.pastVisits('today').map(({ id }) => id);

		// Assert
		expect(today?.id).toBe('today');
		expect(past).toEqual(['nov-19', 'nov-12', 'sep-24']);
	});

	it('has no visit today between sessions', () => {
		// Arrange
		const profile = profileWith(history);

		// Act, Assert
		expect(profile.visitIn(null)).toBeNull();
		expect(profile.pastVisits(null)).toHaveLength(4);
	});

	it('hands a visit to the queue’s actions as that visit, with who it belongs to', () => {
		// Arrange
		const profile = profileWith(history);

		// Act
		const guest = profile.asQueueGuest(history[0]!);

		// Assert
		expect(guest).toMatchObject({
			id: 'today',
			guestId: 'guest-1',
			marketEventId: 'today',
			firstName: 'Maria',
			status: 'called',
			queuePosition: 41,
		});
	});

	it('writes the guest’s initials', () => {
		// Arrange, Act, Assert
		expect(profileWith([]).initials).toBe('ML');
	});
});
