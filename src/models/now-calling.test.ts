import { describe, expect, it } from 'vitest';

import { NowCalling } from './now-calling';

describe('NowCalling', () => {
	it('keeps the main number apart from the priority numbers beside it', () => {
		// Arrange
		const calling = new NowCalling({ nowCalling: 38, calledPriority: [2, 1] });

		// Act
		const shown = { main: calling.main?.label, priority: calling.priority.map((n) => n.label) };

		// Assert
		expect(shown).toEqual({ main: '38', priority: ['P1', 'P2'] });
	});

	it('is empty only while nobody in either series has been called', () => {
		// Arrange
		const boards = [
			new NowCalling({ nowCalling: null, calledPriority: [] }),
			new NowCalling({ nowCalling: null, calledPriority: [1] }),
			new NowCalling({ nowCalling: 3, calledPriority: [] }),
		];

		// Act
		const empty = boards.map((board) => board.isEmpty);

		// Assert
		expect(empty).toEqual([true, false, false]);
	});
});
