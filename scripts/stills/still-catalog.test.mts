import { describe, expect, it } from 'vitest';

import { translations } from '../../src/locales.js';
import { StillCatalog, stills, type StillStep } from './still-catalog.mjs';

const some: StillStep[] = [
	{ id: 'first', anchor: () => 'first' },
	{ id: 'second', anchor: () => 'second' },
	{ id: 'third', anchor: () => 'third' },
];

describe('StillCatalog', () => {
	it('keeps the stills in the order they are declared when none are named', () => {
		// Arrange
		const catalog = new StillCatalog(some);

		// Act
		const selected = catalog.select();

		// Assert
		expect(selected.map((step) => step.id)).toEqual(['first', 'second', 'third']);
	});

	it('keeps only the named stills, in catalog order', () => {
		// Arrange
		const catalog = new StillCatalog(some);

		// Act
		const selected = catalog.select(['third', 'first']);

		// Assert
		expect(selected.map((step) => step.id)).toEqual(['first', 'third']);
	});

	it('refuses a name it does not know, and lists the ones it does', () => {
		// Arrange
		const catalog = new StillCatalog(some);

		// Act
		const select = () => catalog.select(['first', 'nope']);

		// Assert
		expect(select).toThrow(/No still named nope\. Known stills: first, second, third/);
	});
});

describe('the shipped stills', () => {
	it('have unique ids, since an id names a PNG and is what a page embeds it by', () => {
		// Arrange
		const ids = stills.map((step) => step.id);

		// Act
		const unique = new Set(ids);

		// Assert
		expect(unique.size).toBe(ids.length);
	});

	it('name an anchor that exists in every language, so a forced locale can still find its screen', () => {
		// Arrange
		const languages = Object.values(translations);

		// Act
		const anchors = stills.flatMap((step) => languages.map((copy) => step.anchor(copy)));

		// Assert
		expect(anchors.every((anchor) => typeof anchor === 'string' && anchor.length > 0)).toBe(true);
	});

	it('open something in every still that is shot as an overlay', () => {
		// Arrange
		const overlays = stills.filter((step) => step.overlay);

		// Act
		const withoutInteraction = overlays.filter((step) => step.interact === undefined);

		// Assert
		expect(overlays.length).toBeGreaterThan(0);
		expect(withoutInteraction.map((step) => step.id)).toEqual([]);
	});
});
