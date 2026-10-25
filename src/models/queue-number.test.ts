import { describe, expect, it } from 'vitest';

import { QueueNumber } from './queue-number';

describe('QueueNumber', () => {
	it('reads a visit’s number from whichever series it is in', () => {
		// Arrange
		const sources = [
			{ queuePosition: 42, priorityNumber: null },
			{ queuePosition: null, priorityNumber: 1 },
			{ queuePosition: null, priorityNumber: null },
		];

		// Act
		const labels = sources.map((source) => QueueNumber.of(source)?.label ?? null);

		// Assert
		expect(labels).toEqual(['42', 'P1', null]);
	});

	it('reads a response from before the priority series as a main number', () => {
		// Arrange
		const older = { queuePosition: 7 } as { queuePosition: number; priorityNumber: null };

		// Act
		const label = QueueNumber.of(older)?.label;

		// Assert
		expect(label).toBe('7');
	});

	it('writes a priority number’s digits in another script, keeping its letter', () => {
		// Arrange
		const persian = new Intl.NumberFormat('fa-IR');

		// Act
		const labels = [QueueNumber.priority(12), QueueNumber.main(12)].map((number) =>
			number.format((value) => persian.format(value)),
		);

		// Assert
		expect(labels).toEqual(['P۱۲', '۱۲']);
	});

	it('round-trips through the columns it is stored in', () => {
		// Arrange
		const numbers = [QueueNumber.main(3), QueueNumber.priority(3)];

		// Act
		const restored = numbers.map((number) => QueueNumber.of(number.toSource()));

		// Assert
		expect(restored.map((number, index) => number?.equals(numbers[index]!))).toEqual([true, true]);
	});

	it('tells the two series apart even when the value is the same', () => {
		// Arrange
		const main = QueueNumber.main(3);

		// Act
		const equal = [main.equals(QueueNumber.main(3)), main.equals(QueueNumber.priority(3))];

		// Assert
		expect(equal).toEqual([true, false]);
	});

	it('sorts main numbers first, each series counting up', () => {
		// Arrange
		const numbers = [
			QueueNumber.priority(2),
			QueueNumber.main(9),
			QueueNumber.priority(1),
			QueueNumber.main(4),
		];

		// Act
		const sorted = [...numbers].sort(QueueNumber.compare).map((number) => number.label);

		// Assert
		expect(sorted).toEqual(['4', '9', 'P1', 'P2']);
	});
});
