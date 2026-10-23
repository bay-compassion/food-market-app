import { describe, expect, it } from 'vitest';

import { QueueBoard, type QueueBoardState } from './queue-board';

const calling: QueueBoardState = {
	sessionStatus: 'service_started',
	nowCalling: 9,
	called: [9, 7, 4],
	calledPriority: [],
	waitingCount: 20,
};

const labels = (numbers: { label: string }[]) => numbers.map((number) => number.label);

describe('QueueBoard', () => {
	it('calls numbers only once service has started', () => {
		// Arrange
		const boards = (
			['scheduled', 'lottery_pending', 'service_started', 'ended', null] as const
		).map((sessionStatus) => new QueueBoard({ ...calling, sessionStatus }));

		// Act
		const phases = boards.map((board) => board.phase);

		// Assert
		expect(phases).toEqual(['not_started', 'not_started', 'calling', 'ended', 'not_started']);
	});

	it('is idle with no session, one not yet open, or one over — not during registration', () => {
		// Arrange
		const statuses = ['scheduled', 'registration_open', 'service_started', 'ended', null] as const;

		// Act
		const idle = statuses.map(
			(sessionStatus) => new QueueBoard({ ...calling, sessionStatus }).isIdle,
		);

		// Assert
		expect(idle).toEqual([true, false, false, true, true]);
	});

	it('lists earlier unclaimed numbers without repeating the one on the main board', () => {
		// Arrange
		const board = new QueueBoard(calling);

		// Act
		const stillWaitingFor = board.stillWaitingFor;

		// Assert
		expect(labels(stillWaitingFor)).toEqual(['7', '4']);
	});

	it('keeps every called number when the latest has already been served', () => {
		// Arrange
		const board = new QueueBoard({ ...calling, called: [7, 4] });

		// Act
		const stillWaitingFor = board.stillWaitingFor;

		// Assert
		expect(labels(stillWaitingFor)).toEqual(['7', '4']);
	});

	it('lists priority numbers after the main ones, leaving the main board to the main series', () => {
		// Arrange
		const board = new QueueBoard({ ...calling, calledPriority: [2, 1] });

		// Act
		const shown = {
			nowCalling: board.nowCalling?.label,
			stillWaitingFor: labels(board.stillWaitingFor),
		};

		// Assert
		expect(shown).toEqual({
			nowCalling: '9',
			stillWaitingFor: ['7', '4', 'P2', 'P1'],
		});
	});

	it('puts a priority number on the main board until a main number has been called', () => {
		// Arrange
		const board = new QueueBoard({
			...calling,
			nowCalling: null,
			called: [],
			calledPriority: [2, 1],
		});

		// Act
		const shown = {
			nowCalling: board.nowCalling?.label,
			stillWaitingFor: labels(board.stillWaitingFor),
		};

		// Assert
		expect(shown).toEqual({ nowCalling: 'P2', stillWaitingFor: ['P1'] });
	});
});
