import { describe, expect, it } from 'vitest';

import { QueueBoard, type QueueBoardState } from './queue-board';

const calling: QueueBoardState = {
	sessionStatus: 'service_started',
	nowCalling: 9,
	called: [4, 7, 9],
	waitingCount: 20,
};

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

	it('lists earlier unclaimed numbers without repeating the one on the main board', () => {
		// Arrange
		const board = new QueueBoard(calling);

		// Act
		const stillWaitingFor = board.stillWaitingFor;

		// Assert
		expect(stillWaitingFor).toEqual([4, 7]);
	});

	it('keeps every called number when the latest has already been served', () => {
		// Arrange
		const board = new QueueBoard({ ...calling, called: [4, 7] });

		// Act
		const stillWaitingFor = board.stillWaitingFor;

		// Assert
		expect(stillWaitingFor).toEqual([4, 7]);
	});
});
