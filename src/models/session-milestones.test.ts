import { describe, expect, it } from 'vitest';

import type { SessionStatus } from '../services/sessionStateMachine';
import { SessionMilestones } from './session-milestones';

const opensAt = new Date('2026-10-31T17:30:00Z');
const closesAt = new Date('2026-10-31T17:45:00Z');

function milestones(status: SessionStatus, extra = {}) {
	return new SessionMilestones({
		status,
		registrationOpensAt: opensAt,
		registrationClosesAt: closesAt,
		...extra,
	});
}

describe('SessionMilestones', () => {
	it.each<[SessionStatus, string[]]>([
		['scheduled', ['current', 'upcoming', 'upcoming', 'upcoming']],
		['registration_open', ['done', 'current', 'upcoming', 'upcoming']],
		['registration_closed', ['done', 'done', 'current', 'upcoming']],
		['lottery_pending', ['done', 'done', 'current', 'upcoming']],
		['service_started', ['done', 'done', 'done', 'current']],
		['ended', ['done', 'done', 'done', 'done']],
	])('places a %s session on its timeline', (status, expected) => {
		// Arrange
		const session = milestones(status);

		// Act
		const states = session.list.map((milestone) => milestone.state);

		// Assert
		expect(states).toEqual(expected);
	});

	it('derives the draw time from the lottery delay', () => {
		// Arrange
		const session = milestones('scheduled', { lotteryDelayMinutes: 5 });

		// Act
		const drawsAt = session.lotteryDrawsAt;

		// Assert
		expect(drawsAt).toEqual(new Date(closesAt.valueOf() + 10_000 + 5 * 60_000));
	});

	it('prefers the draw time the server sent, which knows about a postponement', () => {
		// Arrange
		const postponed = new Date('2026-10-31T18:00:00Z');
		const session = milestones('lottery_pending', {
			lotteryDelayMinutes: 5,
			lotteryDrawsAt: postponed,
		});

		// Act
		const draw = session.list.find((milestone) => milestone.kind === 'lottery_draw');

		// Assert
		expect(draw?.at).toEqual(postponed);
	});

	it('gives a draw run by hand no time', () => {
		// Arrange
		const session = milestones('lottery_pending');

		// Act
		const drawsAt = session.lotteryDrawsAt;

		// Assert
		expect(drawsAt).toBeNull();
	});
});
