import { describe, expect, it } from 'vitest';

import {
	guestStateFlowchart,
	guestStates,
	guestTransitions,
	type GuestStateKey,
} from './guest-states';

const keys = Object.keys(guestStates) as GuestStateKey[];

describe('guest states', () => {
	it('gives every state its own color, since a color that means two things means neither', () => {
		// Arrange
		const colors = keys.map((key) => guestStates[key].color);

		// Act
		const distinct = new Set(colors);

		// Assert
		expect(distinct.size).toBe(colors.length);
	});

	it('wires every state into the flowchart, so none is a screen the chart forgets', () => {
		// Arrange
		const touched = new Set(guestTransitions.flatMap(({ from, to }) => [from, to].flat()));

		// Act
		const stranded = keys.filter((key) => !touched.has(key));

		// Assert
		expect(stranded).toEqual([]);
	});

	it('draws and colors every state in the chart text', () => {
		// Arrange
		const chart = guestStateFlowchart();

		// Act
		const undrawn = keys.filter(
			(key) =>
				!chart.includes(`${key}["${guestStates[key].label}"]`) &&
				!chart.includes(`${key}(["${guestStates[key].label}"])`),
		);
		const uncolored = keys.filter((key) => !chart.includes(`style ${key} fill:`));

		// Assert
		expect(undrawn).toEqual([]);
		expect(uncolored).toEqual([]);
	});

	it('lets a guest give up their place only while registered or waiting', () => {
		// Arrange
		const cancels = guestTransitions.filter(({ to }) => to === 'cancelled');

		// Act
		const sources = cancels.flatMap(({ from }) => [from].flat());

		// Assert
		expect(sources.sort()).toEqual(['registered', 'waiting']);
	});

	it('ends the day at a second Market Closed box, so the chart flows one way', () => {
		// Arrange
		const chart = guestStateFlowchart();

		// Act
		const arrowsBackToTheStart = chart
			.split('\n')
			.filter((line) => line.includes('-->') && line.endsWith('| marketClosed'));

		// Assert
		expect(arrowsBackToTheStart).toEqual([]);
		expect(chart).toContain('marketClosedEnd(["Market Closed"])');
	});
});
