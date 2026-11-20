import { describe, expect, it } from 'vitest';

import { VisitCommands } from './visit-commands';

describe('VisitCommands', () => {
	it('offers the line’s commands for a lottery visit', () => {
		// Act
		const offered = new VisitCommands({ status: 'called', track: 'lottery' }).offered;

		// Assert
		expect(offered).toEqual(['serve', 'mark_no_show', 'return_to_queue']);
	});

	it('lets a worker remove a premarket volunteer, and nothing else', () => {
		// Arrange
		const commands = new VisitCommands({ status: 'served', track: 'premarket' });

		// Act
		const offered = commands.offered;

		// Assert
		expect(offered).toEqual(['cancel']);
		expect(commands.allows('cancel')).toBe(true);
		expect(commands.allows('return_to_queue')).toBe(false);
	});

	it('never cancels a guest the line served', () => {
		// Act
		const allows = new VisitCommands({ status: 'served', track: 'lottery' }).allows('cancel');

		// Assert
		expect(allows).toBe(false);
	});
});
