import { describe, expect, it } from 'vitest';

import { LineOrder, type LineState } from './line-order';
import { QueueNumber } from './queue-number';

const midService: LineState = {
	highestNumber: 40,
	highestPriorityNumber: null,
	highestOrder: 40,
	othersWaiting: 12,
};

describe('LineOrder', () => {
	it('gives a guest added at the end the next main number, behind everyone', () => {
		// Arrange
		const line = new LineOrder(midService);

		// Act
		const placement = line.place('end', null);

		// Assert
		expect(placement).toEqual({
			queuePosition: 41,
			priorityNumber: null,
			queueFront: false,
			queueOrder: 41,
		});
	});

	it('gives a guest put at the front the next priority number, leaving the main series alone', () => {
		// Arrange
		const line = new LineOrder({ ...midService, highestPriorityNumber: 1 });

		// Act
		const placement = line.place('next', null);

		// Assert
		expect(placement).toEqual({
			queuePosition: null,
			priorityNumber: 2,
			queueFront: true,
			queueOrder: 41,
		});
	});

	it('gives a guest put at the front a main number when nobody is waiting ahead of them', () => {
		// Arrange
		const line = new LineOrder({ ...midService, othersWaiting: 0 });

		// Act
		const placement = line.place('next', null);

		// Assert
		expect(QueueNumber.of(placement)?.label).toBe('41');
	});

	it('lets a returning guest keep their number wherever they go back in', () => {
		// Arrange
		const line = new LineOrder(midService);
		const held = QueueNumber.main(7);

		// Act
		const placements = (['next', 'end'] as const).map((placement) => line.place(placement, held));

		// Assert
		expect(placements.map((placement) => QueueNumber.of(placement)?.label)).toEqual(['7', '7']);
		expect(placements.map((placement) => placement.queueFront)).toEqual([true, false]);
	});

	it('draws the winners behind anyone already placed, with consecutive numbers', () => {
		// Arrange
		const line = new LineOrder({ ...midService, highestNumber: 2, highestOrder: 3 });

		// Act
		const placements = line.draw(3);

		// Assert
		expect(placements.map((placement) => [placement.queuePosition, placement.queueOrder])).toEqual([
			[3, 4],
			[4, 5],
			[5, 6],
		]);
	});

	it('starts the first session’s numbers and order at one', () => {
		// Arrange
		const line = new LineOrder({
			highestNumber: null,
			highestPriorityNumber: null,
			highestOrder: null,
			othersWaiting: 0,
		});

		// Act
		const placement = line.place('end', null);

		// Assert
		expect([placement.queuePosition, placement.queueOrder]).toEqual([1, 1]);
	});

	it('calls guests put at the front first, in the order they were put there, then everyone else', () => {
		// Arrange
		const slots = [
			{ id: 'main-1', queueFront: false, queueOrder: 1 },
			{ id: 'second-front', queueFront: true, queueOrder: 12 },
			{ id: 'unplaced', queueFront: false, queueOrder: null },
			{ id: 'first-front', queueFront: true, queueOrder: 11 },
			{ id: 'main-2', queueFront: false, queueOrder: 2 },
		];

		// Act
		const order = [...slots].sort(LineOrder.compare).map((slot) => slot.id);

		// Assert
		expect(order).toEqual(['first-front', 'second-front', 'main-1', 'main-2', 'unplaced']);
	});
});
