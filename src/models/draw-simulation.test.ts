import { describe, expect, it } from 'vitest';

import { DrawSimulation } from './draw-simulation.ts';

const tiers = [
	{ weight: 1, entries: 180 },
	{ weight: 2, entries: 15 },
	{ weight: 5, entries: 5 },
];

describe('DrawSimulation', () => {
	it('never places more than the spots', () => {
		// Arrange
		const simulation = new DrawSimulation(tiers, 100);

		// Act
		const placed = simulation.draw();

		// Assert
		expect(placed.reduce((sum, count) => sum + count, 0)).toBe(100);
	});

	it('places everyone when spots outnumber entries', () => {
		// Arrange
		const simulation = new DrawSimulation(tiers, 500);

		// Act
		const placed = simulation.draw();

		// Assert
		expect(placed).toEqual([180, 15, 5]);
		expect(simulation.evenChance).toBe(1);
	});

	it('favors higher weights in proportion to the real draw', () => {
		// Arrange
		const simulation = new DrawSimulation(tiers, 100);

		// Act
		const expected = simulation.expectedPlaced(2000);

		// Assert: these bounds sit well outside the sampling noise at 2000 runs.
		expect(expected[0]! / 180).toBeGreaterThan(0.44);
		expect(expected[0]! / 180).toBeLessThan(0.5);
		expect(expected[2]! / 5).toBeGreaterThan(0.9);
	});

	it('counts places moved against even odds', () => {
		// Arrange
		const simulation = new DrawSimulation(tiers, 100);

		// Act
		const moved = simulation.placesMoved([84, 11, 5]);

		// Assert
		expect(moved).toBeCloseTo(6);
	});

	it('estimates a person’s chance at a weight, counting them in the pool', () => {
		// Arrange
		const simulation = new DrawSimulation(tiers, 100);

		// Act
		const standard = simulation.chanceAt(1);
		const highest = simulation.chanceAt(5);

		// Assert
		expect(highest).toBeGreaterThan(standard);
		expect(highest).toBeGreaterThan(0.9);
	});

	it('tells a result within luck from one far outside it', () => {
		// Arrange
		const simulation = new DrawSimulation(tiers, 100);

		// Act
		const within = simulation.withinLuck([86, 9, 5], [84, 11, 5]);
		const outside = simulation.withinLuck([60, 15, 5], [84, 11, 5]);

		// Assert
		expect(within).toBe(true);
		expect(outside).toBe(false);
	});

	it('copes with an empty pool', () => {
		// Arrange
		const simulation = new DrawSimulation([], 100);

		// Act
		const placed = simulation.draw();

		// Assert
		expect(placed).toEqual([]);
		expect(simulation.evenChance).toBe(0);
	});
});
