import { describe, expect, it } from 'vitest';

import { reviewPages, type StoryIndex } from './review-index';

function docs(id: string, title: string, tags: string[]) {
	return { id, title, type: 'docs', tags };
}

describe('reviewPages', () => {
	it('keeps the sections in the order the index lists them, which is the sidebar’s', () => {
		// Arrange
		const index: StoryIndex = {
			entries: {
				a: docs('zebra--docs', 'Guest/Zebra', ['review']),
				b: docs('apple--docs', 'Guest/Apple', ['review']),
			},
		};

		// Act
		const pages = reviewPages(index);

		// Assert
		expect(pages.map(({ label }) => label)).toEqual(['Zebra', 'Apple']);
	});

	it('puts front matter ahead of the sections, wherever it falls in the index', () => {
		// Arrange
		const index: StoryIndex = {
			entries: {
				a: docs('forms--docs', 'Guest/Forms', ['review']),
				b: docs('intro--docs', 'Guest/Introduction', ['review-front']),
			},
		};

		// Act
		const pages = reviewPages(index);

		// Assert
		expect(pages.map(({ kind, label }) => `${kind}:${label}`)).toEqual([
			'front:Introduction',
			'section:Forms',
		]);
	});

	it('leaves out pages that did not ask to be in it, and stories', () => {
		// Arrange
		const index: StoryIndex = {
			entries: {
				a: docs('colors--docs', 'Design System/Colors', ['dev', 'unattached-mdx']),
				b: { id: 'x--story', title: 'Guest/X', type: 'story', tags: ['review'] },
				c: docs('forms--docs', 'Guest/Forms', ['review']),
			},
		};

		// Act
		const pages = reviewPages(index);

		// Assert
		expect(pages.map(({ id }) => id)).toEqual(['forms--docs']);
	});
});
