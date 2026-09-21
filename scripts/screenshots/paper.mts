/** Paper sizes in inches, given portrait. */
export const paperSizes = {
	letter: { widthIn: 8.5, heightIn: 11 },
	a4: { widthIn: 8.27, heightIn: 11.69 },
} as const;

export type PaperSize = keyof typeof paperSizes;

export type Orientation = 'portrait' | 'landscape';

export type PageSize = { widthIn: number; heightIn: number };

/** The size of a page of `paper`, turned to `orientation`. */
export function pageSize(paper: PaperSize, orientation: Orientation): PageSize {
	const { widthIn, heightIn } = paperSizes[paper];

	return orientation === 'portrait'
		? { widthIn, heightIn }
		: { widthIn: heightIn, heightIn: widthIn };
}
