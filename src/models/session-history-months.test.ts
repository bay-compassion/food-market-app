import { describe, expect, it } from 'vitest';

import type { HistoricalEvent } from '../services/admin-api';
import { SessionStatusEnum } from '../services/sessionStateMachine';
import { SessionHistoryMonths } from './session-history-months';

function pastSession(id: string, opensAt: Date): HistoricalEvent {
	return {
		id,
		registrationOpensAt: opensAt.toISOString(),
		registrationClosesAt: new Date(opensAt.valueOf() + 15 * 60_000).toISOString(),
		capacity: 12,
		status: SessionStatusEnum.ENDED,
		guestCount: 20,
	};
}

describe('SessionHistoryMonths', () => {
	it('groups sessions by the month they opened in, keeping their order', () => {
		// Arrange
		const history = new SessionHistoryMonths([
			pastSession('oct-24', new Date(2026, 9, 24, 10, 30)),
			pastSession('oct-3', new Date(2026, 9, 3, 10, 30)),
			pastSession('sep-26', new Date(2026, 8, 26, 10, 30)),
		]);

		// Act
		const months = history.months;

		// Assert
		expect(months.map((month) => month.key)).toEqual(['2026-10', '2026-09']);
		expect(months[0]!.sessions.map((session) => session.id)).toEqual(['oct-24', 'oct-3']);
		expect(months[1]!.start).toEqual(new Date(2026, 8, 1));
	});

	it('has no months for an empty history', () => {
		// Arrange
		const history = new SessionHistoryMonths([]);

		// Act
		const months = history.months;

		// Assert
		expect(months).toEqual([]);
	});
});
