import { describe, expect, it } from 'vitest';

import {
	buildFakeData,
	buildScenario,
	type FakeDataOptions,
	type ScenarioOptions,
} from './fake-data.mjs';

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

function buildScenarioFor(overrides: Partial<ScenarioOptions> = {}) {
	return buildScenario({
		stage: 'registration_open',
		guests: 40,
		capacity: 20,
		seed: 3,
		now,
		...overrides,
	});
}

describe('buildScenario', () => {
	it('replays the same scenario for the same seed', () => {
		const first = buildScenarioFor({ stage: 'service_started' });
		const second = buildScenarioFor({ stage: 'service_started' });

		expect(first.visits.map((visit) => [visit.status, visit.queuePosition])).toEqual(
			second.visits.map((visit) => [visit.status, visit.queuePosition]),
		);
		expect(
			buildScenarioFor({ stage: 'service_started', seed: 4 }).visits.map((visit) => visit.status),
		).not.toEqual(first.visits.map((visit) => visit.status));
	});

	it('produces exactly one session, staged at the requested status', () => {
		for (const stage of [
			'draft',
			'scheduled',
			'registration_open',
			'registration_closed',
			'service_started',
			'ended',
		] as const) {
			const data = buildScenarioFor({ stage });

			expect(data.sessions).toHaveLength(1);
			expect(data.sessions[0]!.status).toBe(stage);
		}
	});

	it('has no guests or visits yet in draft or scheduled', () => {
		for (const stage of ['draft', 'scheduled'] as const) {
			const data = buildScenarioFor({ stage });

			expect(data.guests).toHaveLength(0);
			expect(data.visits).toHaveLength(0);
		}
	});

	it('registration_open: registration is still open, and nobody has a position yet', () => {
		const data = buildScenarioFor({ stage: 'registration_open' });

		expect(data.sessions[0]!.registrationClosesAt > now).toBe(true);
		expect(data.visits.length).toBeGreaterThan(0);
		expect(
			data.visits.every((visit) => visit.status === 'registered' && visit.queuePosition === null),
		).toBe(true);
	});

	it('registration_closed: registration has ended, but the lottery has not run', () => {
		const data = buildScenarioFor({ stage: 'registration_closed' });

		expect(data.sessions[0]!.registrationClosesAt <= now).toBe(true);
		expect(data.visits.length).toBeGreaterThan(0);
		expect(
			data.visits.every((visit) => visit.status === 'registered' && visit.queuePosition === null),
		).toBe(true);
	});

	it('ended: nothing is left waiting or called', () => {
		const data = buildScenarioFor({ stage: 'ended', guests: 60 });

		expect(data.visits.some((visit) => visit.queuePosition !== null)).toBe(true);
		expect(
			data.visits.every((visit) => visit.status !== 'waiting' && visit.status !== 'called'),
		).toBe(true);
	});

	it('service_started: never exceeds capacity, and progress drains the queue in order', () => {
		const rank: Record<string, number> = { served: 0, no_show: 0, called: 1, waiting: 2 };

		for (const serviceProgress of ['just_started', 'halfway', 'nearly_done'] as const) {
			const data = buildScenarioFor({ stage: 'service_started', guests: 60, serviceProgress });
			const placed = data.visits
				.filter((visit) => visit.queuePosition !== null)
				.sort((first, second) => first.queuePosition! - second.queuePosition!);

			expect(placed.length).toBeLessThanOrEqual(data.sessions[0]!.capacity);
			for (let index = 1; index < placed.length; index += 1) {
				expect(rank[placed[index]!.status]).toBeGreaterThanOrEqual(
					rank[placed[index - 1]!.status]!,
				);
			}
		}
	});

	it('further-along progress leaves fewer guests waiting', () => {
		const waitingCount = (progress: 'just_started' | 'halfway' | 'nearly_done') =>
			buildScenarioFor({
				stage: 'service_started',
				guests: 60,
				serviceProgress: progress,
			}).visits.filter((visit) => visit.status === 'waiting').length;

		expect(waitingCount('just_started')).toBeGreaterThan(waitingCount('halfway'));
		expect(waitingCount('halfway')).toBeGreaterThan(waitingCount('nearly_done'));
	});
});
