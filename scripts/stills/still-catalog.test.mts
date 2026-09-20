import { describe, expect, it } from 'vitest';

import { translations } from '../../src/locales.js';
import { stillArcs, StillCatalog, type StillArc } from './still-catalog.mjs';

const arcs: StillArc[] = [
	{
		id: 'guest-day',
		title: 'A guest’s day',
		summary: '',
		steps: [
			{ id: 'first', caption: 'Between markets', anchor: () => 'first' },
			{ id: 'second', caption: 'Registration is open', anchor: () => 'second' },
		],
	},
	{
		id: 'elsewhere',
		title: 'Other ways in',
		summary: '',
		steps: [{ id: 'third', caption: 'Saving details', anchor: () => 'third' }],
	},
];

describe('StillCatalog', () => {
	it('keeps the arcs and their steps in the order they are declared', () => {
		// Arrange
		const catalog = new StillCatalog(arcs);

		// Act
		const sections = catalog.sections();

		// Assert
		expect(sections.map((section) => section.arc.id)).toEqual(['guest-day', 'elsewhere']);
		expect(sections[0]?.steps.map((step) => step.id)).toEqual(['first', 'second']);
	});

	it('keeps only the requested arcs when some are named', () => {
		// Arrange
		const catalog = new StillCatalog(arcs);

		// Act
		const sections = catalog.sections(['elsewhere']);

		// Assert
		expect(sections.map((section) => section.arc.id)).toEqual(['elsewhere']);
	});
});

describe('the shipped arcs', () => {
	const steps = stillArcs.flatMap((arc) => arc.steps);

	it('have unique arc ids and unique step ids, since a step id names its PNG', () => {
		// Arrange
		const arcIds = stillArcs.map((arc) => arc.id);
		const stepIds = steps.map((step) => step.id);

		// Act
		const uniqueArcIds = new Set(arcIds);
		const uniqueStepIds = new Set(stepIds);

		// Assert
		expect(uniqueArcIds.size).toBe(arcIds.length);
		expect(uniqueStepIds.size).toBe(stepIds.length);
	});

	it('name an anchor that exists in every language, so a forced locale can still find its screen', () => {
		// Arrange
		const languages = Object.values(translations);

		// Act
		const anchors = steps.flatMap((step) => languages.map((copy) => step.anchor(copy)));

		// Assert
		expect(anchors.every((anchor) => typeof anchor === 'string' && anchor.length > 0)).toBe(true);
	});

	it('open something in every step that is shot as an overlay', () => {
		// Arrange
		const overlays = steps.filter((step) => step.overlay);

		// Act
		const withoutInteraction = overlays.filter((step) => step.interact === undefined);

		// Assert
		expect(overlays.length).toBeGreaterThan(0);
		expect(withoutInteraction.map((step) => step.id)).toEqual([]);
	});
});
