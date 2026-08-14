import { describe, expect, it } from 'vitest';

import { buildFakeData, type FakeDataOptions } from './fake-data.mjs';

const now = new Date('2026-08-13T18:00:00');

function build(overrides: Partial<FakeDataOptions> = {}) {
	return buildFakeData({
		sessions: 6,
		guests: 40,
		capacity: 20,
		seed: 7,
		openSession: false,
		now,
		...overrides,
	});
}

describe('buildFakeData', () => {
	it('replays the same history for the same seed', () => {
		const first = build();
		const second = build();

		expect(first.visits.map((visit) => [visit.status, visit.queuePosition])).toEqual(
			second.visits.map((visit) => [visit.status, visit.queuePosition]),
		);
		expect(build({ seed: 8 }).visits.map((visit) => visit.status)).not.toEqual(
			first.visits.map((visit) => visit.status),
		);
	});

	it('generates one past session per week, all ended', () => {
		const { sessions } = build();

		expect(sessions).toHaveLength(6);
		expect(sessions.every((session) => session.status === 'ended')).toBe(true);
		expect(sessions.every((session) => session.registrationOpensAt < now)).toBe(true);
	});

	it('never places more guests than the session has capacity for', () => {
		const data = build();

		for (const session of data.sessions) {
			const placed = data.visits.filter(
				(visit) => visit.marketEventId === session.id && visit.queuePosition !== null,
			);

			expect(placed.length).toBeLessThanOrEqual(session.capacity);
		}
	});

	it('gives each guest at most one visit per session', () => {
		const data = build();
		const pairs = data.visits.map((visit) => `${visit.marketEventId}:${visit.guestId}`);

		expect(new Set(pairs).size).toBe(pairs.length);
	});

	it('marks only a guest’s earliest visit as their first', () => {
		const data = build();

		for (const guest of data.guests) {
			const visits = data.visits
				.filter((visit) => visit.guestId === guest.id)
				.sort((first, second) => first.createdAt.valueOf() - second.createdAt.valueOf());
			const firsts = visits.filter((visit) => visit.isFirstVisit);

			expect(firsts).toEqual(visits.slice(0, 1));
		}
	});

	it('records service timings in order, and leaves some unrecorded', () => {
		const served = build().visits.filter((visit) => visit.status === 'served');
		const timed = served.filter((visit) => visit.calledAt && visit.servedAt);

		expect(timed.every((visit) => visit.servedAt! > visit.calledAt!)).toBe(true);
		expect(timed.length).toBeGreaterThan(0);
		expect(timed.length).toBeLessThan(served.length);
	});

	it('creates every guest before their first visit', () => {
		const data = build();

		for (const visit of data.visits.filter((candidate) => candidate.isFirstVisit)) {
			const guest = data.guests.find((candidate) => candidate.id === visit.guestId);

			expect(guest!.createdAt.valueOf()).toBeLessThan(visit.createdAt.valueOf());
		}
	});

	it('adds an open session whose visits are all still registered', () => {
		const data = build({ openSession: true });
		const open = data.sessions.at(-1)!;
		const openVisits = data.visits.filter((visit) => visit.marketEventId === open.id);

		expect(open.status).toBe('registration_open');
		expect(open.registrationClosesAt > now).toBe(true);
		expect(openVisits.length).toBeGreaterThan(0);
		expect(
			openVisits.every((visit) => visit.status === 'registered' && visit.queuePosition === null),
		).toBe(true);
	});
});
