import { describe, expect, it } from 'vitest';

import { stillFrames, StillCatalog, stillGroups, type StillGroup } from './still-catalog.mjs';
import type { StorybookStory } from './storybook-index.mjs';

function story(title: string, name = 'Default'): StorybookStory {
	return { id: `${title}--${name}`.toLowerCase(), title, name, tags: [] };
}

const groups: StillGroup[] = [
	{ id: 'guest', title: 'Guest', summary: '', frame: 'phone', titles: ['Guest'] },
	{
		id: 'visit',
		title: 'Visit',
		summary: '',
		frame: 'phone',
		titles: ['Guest/Session States/GuestVisitStatus'],
	},
	{
		id: 'admin',
		title: 'Admin',
		summary: '',
		frame: 'desktop',
		titles: ['Admin', { prefix: 'Admin/QueueGuestRow', frame: 'panel' }],
	},
];

describe('StillCatalog', () => {
	it('claims a story for the most specific group that matches it', () => {
		// Arrange
		const catalog = new StillCatalog(groups);

		// Act
		const specific = catalog.groupFor(story('Guest/Session States/GuestVisitStatus'));
		const general = catalog.groupFor(story('Guest/Forms/Lottery Form'));

		// Assert
		expect(specific?.id).toBe('visit');
		expect(general?.id).toBe('guest');
	});

	it('does not let a title prefix match a partial path segment', () => {
		// Arrange
		const catalog = new StillCatalog(groups);

		// Act
		const group = catalog.groupFor(story('Guestbook/Something'));

		// Assert
		expect(group).toBeUndefined();
	});

	it('orders sections by the catalog and stories by the index', () => {
		// Arrange
		const catalog = new StillCatalog(groups);
		const stories = [
			story('Admin/QueueView', 'During Service'),
			story('Guest/Forms/Lottery Form', 'Default'),
			story('Guest/Forms/Lottery Form', 'Right To Left'),
		];

		// Act
		const sections = catalog.sections(stories);

		// Assert
		expect(sections.map((section) => section.group.id)).toEqual(['guest', 'admin']);
		expect(sections[0]?.stories.map((entry) => entry.name)).toEqual(['Default', 'Right To Left']);
	});

	it('keeps only the requested groups when asked for some', () => {
		// Arrange
		const catalog = new StillCatalog(groups);
		const stories = [story('Admin/QueueView'), story('Guest/Forms/Lottery Form')];

		// Act
		const sections = catalog.sections(stories, ['admin']);

		// Assert
		expect(sections.map((section) => section.group.id)).toEqual(['admin']);
	});

	it('reports stories no group claims so the catalog can be caught up', () => {
		// Arrange
		const catalog = new StillCatalog(groups);
		const stories = [story('Guest/Forms/Lottery Form'), story('Reports/Weekly')];

		// Act
		const unmatched = catalog.unmatched(stories);

		// Assert
		expect(unmatched.map((entry) => entry.title)).toEqual(['Reports/Weekly']);
	});

	it('shoots a story at the frame its own title names', () => {
		// Arrange
		const catalog = new StillCatalog(groups);

		// Act
		const row = catalog.frameFor(story('Admin/QueueGuestRow', 'Waiting'));
		const screen = catalog.frameFor(story('Admin/QueueView', 'During Service'));

		// Assert
		expect(row).toBe(stillFrames.panel);
		expect(screen).toBe(stillFrames.desktop);
	});

	it('ships a catalog whose group ids are unique', () => {
		// Arrange
		const ids = stillGroups.map((group) => group.id);

		// Act
		const unique = new Set(ids);

		// Assert
		expect(unique.size).toBe(ids.length);
	});
});
