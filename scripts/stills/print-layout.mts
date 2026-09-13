/**
 * Page geometry for the printed contact sheets.
 *
 * The whole point of the stills is that they come off a printer at a predictable size, so paper is
 * the fixed input here and the stills are what gets scaled. A page is divided into a fixed grid of
 * cells; every still is scaled to fit its cell rather than the page growing to fit the still. That
 * makes overflow impossible by construction instead of something to check for afterwards.
 */

/** Paper sizes in inches, given portrait. */
export const paperSizes = {
	letter: { widthIn: 8.5, heightIn: 11 },
	a4: { widthIn: 8.27, heightIn: 11.69 },
} as const;

export type PaperSize = keyof typeof paperSizes;

export type Orientation = 'portrait' | 'landscape';

export type PrintLayoutOptions = {
	paper: PaperSize;
	orientation: Orientation;
	/** Trim margin on all four sides. Home and office printers rarely manage less than 0.25in. */
	marginIn: number;
	columns: number;
	rows: number;
	/** Gutter between cells, which is also the hand-annotation space between stills. */
	gapIn: number;
	/** Room under each still for its number, what the beat is, and which component it is. */
	captionHeightIn: number;
	/** Room at the top of every page for the running group heading. */
	headerHeightIn: number;
};

/**
 * A still wider than this gets the whole row rather than one column. The threshold is "wider than a
 * phone": a desktop screen or a side-by-side story squeezed into a phone-sized column is too small
 * to read, while a short wide strip captured at phone width belongs in the grid with its neighbours.
 */
export const fullRowWidthPx = 640;

/** A still's pixel dimensions as captured. */
export type StillSize = { width: number; height: number };

/** A still scaled into its cell, in inches, plus how many columns that cell occupies. */
export type PlacedStill = {
	widthIn: number;
	heightIn: number;
	columnSpan: number;
};

export const defaultPrintLayoutOptions: PrintLayoutOptions = {
	paper: 'letter',
	orientation: 'portrait',
	marginIn: 0.4,
	columns: 3,
	rows: 2,
	gapIn: 0.22,
	captionHeightIn: 0.46,
	headerHeightIn: 0.42,
};

export class PrintLayout {
	constructor(private readonly options: PrintLayoutOptions = defaultPrintLayoutOptions) {}

	get columns(): number {
		return this.options.columns;
	}

	get rows(): number {
		return this.options.rows;
	}

	get captionHeightIn(): number {
		return this.options.captionHeightIn;
	}

	get headerHeightIn(): number {
		return this.options.headerHeightIn;
	}

	get gapIn(): number {
		return this.options.gapIn;
	}

	get marginIn(): number {
		return this.options.marginIn;
	}

	get pageWidthIn(): number {
		const { widthIn, heightIn } = paperSizes[this.options.paper];

		return this.options.orientation === 'portrait' ? widthIn : heightIn;
	}

	get pageHeightIn(): number {
		const { widthIn, heightIn } = paperSizes[this.options.paper];

		return this.options.orientation === 'portrait' ? heightIn : widthIn;
	}

	/** The printable box once the trim margin is taken off. */
	get contentWidthIn(): number {
		return this.pageWidthIn - 2 * this.options.marginIn;
	}

	get contentHeightIn(): number {
		return this.pageHeightIn - 2 * this.options.marginIn;
	}

	/** What is left for stills once the running heading has its band. */
	get gridHeightIn(): number {
		return this.contentHeightIn - this.options.headerHeightIn;
	}

	get cellWidthIn(): number {
		return (this.contentWidthIn - (this.columns - 1) * this.options.gapIn) / this.columns;
	}

	get cellHeightIn(): number {
		return (this.gridHeightIn - (this.rows - 1) * this.options.gapIn) / this.rows;
	}

	/** The tallest a still itself may print, i.e. its cell less the caption under it. */
	get stillHeightIn(): number {
		return this.cellHeightIn - this.options.captionHeightIn;
	}

	get stillsPerPage(): number {
		return this.columns * this.rows;
	}

	/**
	 * Whether the requested grid leaves room for anything. A caller asking for more rows than the
	 * page can carry gets told rather than handed a sheet of slivers.
	 */
	get isUsable(): boolean {
		return this.cellWidthIn > 0 && this.stillHeightIn > 0;
	}

	assertUsable(): void {
		if (this.isUsable) {
			return;
		}

		throw new Error(
			`A ${this.columns}×${this.rows} grid does not fit on ${this.options.paper} ` +
				`${this.options.orientation} with ${this.options.marginIn}in margins: each still would ` +
				`get ${this.cellWidthIn.toFixed(2)}in × ${this.stillHeightIn.toFixed(2)}in. ` +
				'Ask for fewer columns or rows, or a narrower margin.',
		);
	}

	/**
	 * Scales one still into its cell, keeping its aspect ratio. A still wider than a phone — an admin
	 * screen, or a story that lays its own states out side by side — takes the full row instead.
	 */
	place(size: StillSize): PlacedStill {
		const columnSpan = size.width > fullRowWidthPx ? this.columns : 1;
		const boxWidthIn = columnSpan === 1 ? this.cellWidthIn : this.contentWidthIn;
		const scale = Math.min(boxWidthIn / size.width, this.stillHeightIn / size.height);

		return { widthIn: size.width * scale, heightIn: size.height * scale, columnSpan };
	}

	/**
	 * Packs placed stills into pages, returning the indices that belong on each. Pagination is done
	 * here rather than left to the browser's page breaking so that a page is always exactly one
	 * sheet of paper — CSS fragmentation of a wrapped flex container is not dependable enough to
	 * stake a print run on.
	 */
	paginate(placements: readonly PlacedStill[]): number[][] {
		const pages: number[][] = [];
		let page: number[] = [];
		let columnsUsed = 0;
		let rowsUsed = 0;

		for (const [index, placement] of placements.entries()) {
			if (columnsUsed + placement.columnSpan > this.columns) {
				rowsUsed += 1;
				columnsUsed = 0;
			}

			if (rowsUsed >= this.rows) {
				pages.push(page);
				page = [];
				columnsUsed = 0;
				rowsUsed = 0;
			}

			page.push(index);
			columnsUsed += placement.columnSpan;
		}

		if (page.length > 0) {
			pages.push(page);
		}

		return pages;
	}
}
