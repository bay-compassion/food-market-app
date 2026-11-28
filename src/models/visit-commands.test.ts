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

	it.each([
		['waiting', ['call', 'cancel']],
		['called', ['serve', 'return_to_queue', 'cancel']],
		['served', []],
		['cancelled', []],
	] as const)('offers a %s standby guest everything but a no-show', (status, expected) => {
		// Act
		const offered = new VisitCommands({ status, track: 'postmarket' }).offered;

		// Assert
		expect(offered).toEqual(expected);
	});

	it('never marks a standby guest a no-show', () => {
		// Arrange
		const commands = new VisitCommands({ status: 'called', track: 'postmarket' });

		// Act
		const allows = commands.allows('mark_no_show');

		// Assert
		expect(allows).toBe(false);
	});

	it('lets a worker cancel a called standby guest, which the line never allows', () => {
		// Act
		const standby = new VisitCommands({ status: 'called', track: 'postmarket' });
		const line = new VisitCommands({ status: 'called', track: 'lottery' });

		// Assert
		expect(standby.allows('cancel')).toBe(true);
		expect(line.allows('cancel')).toBe(false);
	});

	it('neither notifies a called standby guest nor gives a returned one a place in line', () => {
		// Act
		const standby = new VisitCommands({ status: 'called', track: 'postmarket' });
		const line = new VisitCommands({ status: 'called', track: 'lottery' });

		// Assert
		expect([standby.notifiesWhenCalled, standby.returnsToAPlaceInLine]).toEqual([false, false]);
		expect([line.notifiesWhenCalled, line.returnsToAPlaceInLine]).toEqual([true, true]);
	});
});
