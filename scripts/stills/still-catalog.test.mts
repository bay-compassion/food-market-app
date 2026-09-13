import { describe, expect, it } from 'vitest';

import { stillArcs, StillCatalog, stillFrames, type StillArc } from './still-catalog.mjs';
import type { StorybookStory } from './storybook-index.mjs';

function story(id: string): StorybookStory {
	return { id, title: 'Guest/Whatever', name: 'Whatever', tags: [] };
}

const arcs: StillArc[] = [
	{
		id: 'guest-day',
		title: 'A guest’s day',
		summary: '',
		frame: 'phone',
		steps: [
			{ id: 'first', caption: 'Between markets' },
			{ id: 'second', caption: 'Recognized on this device', frame: 'component' },
		],
	},
	{
		id: 'market-day',
		title: 'The market’s state',
		summary: '',
		frame: 'desktop',
		steps: [{ id: 'third', caption: 'Registration open' }],
	},
];

describe('StillCatalog', () => {
	it('keeps the arcs and their steps in the order they are declared', () => {
		// Arrange
		const catalog = new StillCatalog(arcs);

		// Act
		const sections = catalog.sections();

		// Assert
		expect(sections.map((section) => section.arc.id)).toEqual(['guest-day', 'market-day']);
		expect(sections[0]?.steps.map((step) => step.id)).toEqual(['first', 'second']);
	});

	it('keeps only the requested arcs when some are named', () => {
		// Arrange
		const catalog = new StillCatalog(arcs);

		// Act
		const sections = catalog.sections(['market-day']);

		// Assert
		expect(sections.map((section) => section.arc.id)).toEqual(['market-day']);
	});

	it('shoots a step at the frame it names, falling back to its arc’s', () => {
		// Arrange
		const catalog = new StillCatalog(arcs);
		const arc = arcs[0]!;

		// Act
		const inherited = catalog.frameFor(arc, arc.steps[0]!);
		const overridden = catalog.frameFor(arc, arc.steps[1]!);

		// Assert
		expect(inherited).toBe(stillFrames.phone);
		expect(overridden).toBe(stillFrames.component);
	});

	it('names the step ids Storybook no longer has', () => {
		// Arrange
		const catalog = new StillCatalog(arcs);

		// Act
		const missing = catalog.missing([story('first'), story('third')]);

		// Assert
		expect(missing).toEqual(['second']);
	});

	it('does not treat a story no arc names as a problem', () => {
		// Arrange
		const catalog = new StillCatalog(arcs);

		// Act
		const missing = catalog.missing([
			story('first'),
			story('second'),
			story('third'),
			story('spare'),
		]);

		// Assert
		expect(missing).toEqual([]);
	});

	it('ships arcs whose ids are unique and whose steps are never repeated', () => {
		// Arrange
		const ids = stillArcs.map((arc) => arc.id);
		const stepIds = stillArcs.flatMap((arc) => arc.steps.map((step) => step.id));

		// Act
		const uniqueIds = new Set(ids);
		const uniqueStepIds = new Set(stepIds);

		// Assert
		expect(uniqueIds.size).toBe(ids.length);
		expect(uniqueStepIds.size).toBe(stepIds.length);
	});
});
