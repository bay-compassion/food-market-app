/**
 * Which docs pages make up the review document, read from Storybook's story index.
 *
 * Shared by the capture script, which prints them, and the Contents component, which lists them, so
 * the two cannot disagree about what is in the document or in what order. It touches no DOM and no
 * Node API, since it runs in both.
 */

/** The tags an MDX docs page puts on its `<Meta>` to join the document. */
export const reviewTags = {
	/** A numbered section, with figures a reviewer can quote. */
	section: 'review',
	/** Front matter, printed ahead of the sections and not numbered: the title page and contents. */
	front: 'review-front',
} as const;

export type ReviewPage = {
	/** The docs entry's id, e.g. `guest-forms--docs` — the `id` in its Storybook URL. */
	id: string;
	/** Its sidebar path, e.g. `Guest/Forms`. */
	title: string;
	/** The last part of the path, e.g. `Forms`, which is what the document calls the page. */
	label: string;
	kind: 'front' | 'section';
};

export type IndexEntry = { id: string; title: string; type: string; tags?: string[] };

export type StoryIndex = { entries: Record<string, IndexEntry> };

export function isStoryIndex(value: unknown): value is StoryIndex {
	return typeof value === 'object' && value !== null && 'entries' in value;
}

/**
 * The pages tagged for the document: front matter first, then the sections, each group in the
 * order Storybook lists it. That order is the sidebar's — the index is sorted by the preview's
 * `storySort` — so where a section falls in the document is decided where it falls in the sidebar.
 */
export function reviewPages(index: StoryIndex): ReviewPage[] {
	const pages = Object.values(index.entries)
		.filter((entry) => entry.type === 'docs')
		.flatMap((entry): ReviewPage[] => {
			const kind = entry.tags?.includes(reviewTags.front)
				? 'front'
				: entry.tags?.includes(reviewTags.section)
					? 'section'
					: null;

			return kind
				? [
						{
							id: entry.id,
							title: entry.title,
							label: entry.title.split('/').at(-1) ?? entry.title,
							kind,
						},
					]
				: [];
		});

	return [
		...pages.filter(({ kind }) => kind === 'front'),
		...pages.filter(({ kind }) => kind === 'section'),
	];
}

/**
 * What a print run knows about the document that a page cannot know for itself, handed to the pages
 * as `window.__REVIEW_CONTENTS__` before they render. Absent when a page is read in Storybook.
 */
export type ReviewContents = {
	sections: { number: number; label: string; startPage: number; pages: number }[];
	capturedAt: string;
	revision: string;
	language: string;
};

declare global {
	interface Window {
		__REVIEW_CONTENTS__?: ReviewContents;
	}
}
