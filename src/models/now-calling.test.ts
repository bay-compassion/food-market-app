import { describe, expect, it } from 'vitest';

import { NowCalling } from './now-calling';

describe('NowCalling', () => {
	it('keeps the main number apart from the priority numbers beside it', () => {
		// Arrange
		const calling = new NowCalling({ nowCalling: 38, called: [38], calledPriority: [2, 1] });

		// Act
		const shown = { main: calling.main?.label, priority: calling.priority.map((n) => n.label) };

		// Assert
		expect(shown).toEqual({ main: '38', priority: ['P1', 'P2'] });
	});

	it('is empty only while nobody in either series has been called', () => {
		// Arrange
		const boards = [
			new NowCalling({ nowCalling: null, called: [], calledPriority: [] }),
			new NowCalling({ nowCalling: null, called: [], calledPriority: [1] }),
			new NowCalling({ nowCalling: 3, called: [3], calledPriority: [] }),
		];

		// Act
		const empty = boards.map((board) => board.isEmpty);

		// Assert
		expect(empty).toEqual([true, false, false]);
	});

	it('shows the rest of a batch beside the main number, in counting order', () => {
		// Arrange
		const calling = new NowCalling({ nowCalling: 38, called: [38, 37, 36], calledPriority: [] });

		// Act
		const earlier = calling.earlier.map((number) => number.label);

		// Assert
		expect(earlier).toEqual(['36', '37']);
	});

	it('keeps only the most recently called few earlier numbers', () => {
		// Arrange
		const calling = new NowCalling({
			nowCalling: 50,
			called: [50, 12, 49, 48, 47],
			calledPriority: [],
		});

		// Act
		const earlier = calling.earlier.map((number) => number.label);

		// Assert
		expect(earlier).toEqual(['12', '48', '49']);
	});

	it('keeps the main number on the row after that guest reaches the table', () => {
		// Arrange
		const calling = new NowCalling({ nowCalling: 38, called: [37], calledPriority: [] });

		// Act
		const shown = { main: calling.main?.label, earlier: calling.earlier.map((n) => n.label) };

		// Assert
		expect(shown).toEqual({ main: '38', earlier: ['37'] });
	});
});
