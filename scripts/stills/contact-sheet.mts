import type { PrintLayout } from './print-layout.mjs';
import type { StillArc } from './still-catalog.mjs';
import type { Still } from './still-photographer.mjs';

export type SheetSection = {
	arc: StillArc;
	stills: Still[];
};

export type SheetMeta = {
	title: string;
	generatedAt: Date;
	/** The commit the stills were shot from, so a marked-up print can be traced back to code. */
	revision: string;
	/** The language every screen was shot in. */
	language: string;
	/**
	 * The docs pages printed ahead of the stills, in order. They are the document's first sections,
	 * so the stills' sections are numbered after them and the contents page lists them all.
	 */
	docs: { title: string; pages: number }[];
};

function escapeHtml(value: string): string {
	return value.replace(
		/[&<>"]/g,
		(character) =>
			({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character] ?? character,
	);
}

function inches(value: number): string {
	return `${value.toFixed(3)}in`;
}

/** Where in the app a still was taken, without a claim code or anything else after the path. */
function pathOf(route: string | undefined): string {
	return (route ?? '/').split(/[?#]/)[0] ?? '/';
}

/**
 * Renders the captured stills as printable sheets.
 *
 * Pagination is done here from `PrintLayout` rather than handed to the browser's page breaking, so
 * that one `.page` is exactly one sheet of paper: the print is the deliverable, and a sheet that
 * quietly reflowed into two is a worse failure than one that refuses to build.
 */
export class ContactSheet {
	constructor(
		private readonly layout: PrintLayout,
		private readonly sections: readonly SheetSection[],
		private readonly meta: SheetMeta,
	) {}

	get stillCount(): number {
		return this.sections.reduce((total, section) => total + section.stills.length, 0);
	}

	/** Sheets behind the contents page: each section's opener, and then its stills. */
	get sheetCount(): number {
		return this.sections.reduce((total, section) => total + this.sheetsIn(section), 0);
	}

	toHtml(): string {
		return [
			`<!doctype html>`,
			`<html lang="en"><head><meta charset="utf-8">`,
			`<title>${escapeHtml(this.meta.title)}</title>`,
			`<style>${this.css()}</style>`,
			`</head><body>`,
			this.coverPage(),
			this.sections
				.map((section, index) => this.sectionPages(section, this.firstSectionNumber + index))
				.join('\n'),
			`</body></html>`,
		].join('\n');
	}

	/** Docs pages come first, so the first of the stills' sections is numbered after them. */
	private get firstSectionNumber(): number {
		return this.meta.docs.length + 1;
	}

	private sheetsIn(section: SheetSection): number {
		return 1 + this.pagesOf(section).length;
	}

	private pagesOf(section: SheetSection): number[][] {
		return this.layout.paginate(section.stills.map((still) => this.layout.place(still)));
	}

	private coverPage(): string {
		const { layout, meta } = this;
		const docs = meta.docs
			.map(
				(doc, index) => `<li><span class="index">${index + 1}</span>
					<span class="name">${escapeHtml(doc.title)}
						<em>Explanation, with the screens it describes</em></span>
					<span class="count">${doc.pages} page${doc.pages === 1 ? '' : 's'}</span>
				</li>`,
			)
			.join('\n');
		const stills = this.sections
			.map((section, index) => {
				const sheets = this.sheetsIn(section);

				return `<li><span class="index">${this.firstSectionNumber + index}</span>
					<span class="name">${escapeHtml(section.arc.title)}
						<em>${escapeHtml(section.arc.summary)}</em></span>
					<span class="count">${section.stills.length} stills · ${sheets} sheet${sheets === 1 ? '' : 's'}</span>
				</li>`;
			})
			.join('\n');
		const contents = `${docs}\n${stills}`;

		return `<article class="page cover">
			<h1>${escapeHtml(meta.title)}</h1>
			<p class="lede">What a guest sees and is sent, exactly as the app shows it on a phone.
				Numbers are <b>section.figure</b> — quote them when you mark a page up.</p>
			<ol class="contents">${contents}</ol>
			<dl class="colophon">
				<dt>Captured</dt><dd>${escapeHtml(meta.generatedAt.toISOString().slice(0, 16).replace('T', ' '))} UTC</dd>
				<dt>Revision</dt><dd>${escapeHtml(meta.revision)}</dd>
				<dt>Language</dt><dd>${escapeHtml(meta.language)}</dd>
				<dt>Paper</dt><dd>${inches(layout.pageWidthIn)} × ${inches(layout.pageHeightIn)}, ${layout.marginIn}in margins</dd>
				<dt>Grid</dt><dd>${layout.columns} × ${layout.rows} per sheet · ${this.stillCount} stills on ${this.sheetCount} sheets, behind this one</dd>
			</dl>
		</article>`;
	}

	private sectionPages(section: SheetSection, arcNumber: number): string {
		const pages = this.pagesOf(section);

		return [
			this.opener(section, arcNumber),
			...pages.map((indices, pageIndex) => {
				const cells = indices.map((index) => this.cell(section, index, arcNumber)).join('\n');

				return `<article class="page">
					<header class="running">
						<span class="arc"><b>${arcNumber}</b> ${escapeHtml(section.arc.title)}</span>
						<span class="sheet">Sheet ${pageIndex + 1} of ${pages.length}</span>
					</header>
					<div class="grid">${cells}</div>
				</article>`;
			}),
		].join('\n');
	}

	/**
	 * A sheet of its own ahead of a section's stills, for the author's explanation of it. It is a
	 * page rather than a block on the first still's sheet because a still fills its sheet, and
	 * because a reviewer should read what a section is for before they start marking it up.
	 */
	private opener(section: SheetSection, arcNumber: number): string {
		const { arc } = section;
		const paragraphs = (arc.details ?? '')
			.split(/\n\s*\n/)
			.map((paragraph) => paragraph.trim())
			.filter(Boolean)
			.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
			.join('\n');

		return `<article class="page opener">
			<p class="number">${arcNumber}</p>
			<h2>${escapeHtml(arc.title)}</h2>
			<p class="summary">${escapeHtml(arc.summary)}</p>
			<div class="details">${paragraphs}</div>
			<p class="count">${section.stills.length} stills follow, numbered ${arcNumber}.1 to ${arcNumber}.${section.stills.length}.</p>
		</article>`;
	}

	private cell(section: SheetSection, index: number, arcNumber: number): string {
		const still = section.stills[index];

		if (!still) {
			return '';
		}

		const placed = this.layout.place(still);
		const cellWidth =
			placed.columnSpan === 1 ? this.layout.cellWidthIn : this.layout.contentWidthIn;
		const notes = still.truncated ? 'cut off' : '';

		return `<figure class="cell" style="width:${inches(cellWidth)}">
			<figcaption>
				<b>${arcNumber}.${index + 1}</b> ${escapeHtml(still.step.caption)}
				${still.step.note ? `<span class="note">${escapeHtml(still.step.note)}</span>` : ''}
				<em>${[still.step.message ? '' : pathOf(still.step.route), notes].filter(Boolean).map(escapeHtml).join(' · ')}</em>
			</figcaption>
			<div class="shot">
				<img src="${escapeHtml(still.file.split('\\').join('/'))}" alt=""
					style="width:${inches(placed.widthIn)};height:${inches(placed.heightIn)}">
			</div>
		</figure>`;
	}

	private css(): string {
		const { layout } = this;

		return `
			@page { size: ${inches(layout.pageWidthIn)} ${inches(layout.pageHeightIn)}; margin: 0; }
			* { box-sizing: border-box; }
			html, body { margin: 0; padding: 0; background: #fff; color: #111; }
			body {
				font: 400 9pt/1.35 ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, sans-serif;
				-webkit-print-color-adjust: exact; print-color-adjust: exact;
			}
			.page {
				width: ${inches(layout.pageWidthIn)}; height: ${inches(layout.pageHeightIn)};
				padding: ${inches(layout.marginIn)}; overflow: hidden; position: relative;
				break-after: page; page-break-after: always;
			}
			.page:last-of-type { break-after: auto; page-break-after: auto; }
			.running {
				height: ${inches(layout.headerHeightIn)}; display: flex; align-items: flex-start;
				justify-content: space-between; gap: 0.2in;
				border-bottom: 0.5pt solid #c8c8c8; margin-bottom: ${inches(layout.gapIn * 0.5)};
			}
			.running .arc { font-size: 10.5pt; letter-spacing: 0.01em; }
			.running .arc b { font-weight: 700; margin-right: 0.06in; }
			.running .sheet { font-size: 7.5pt; color: #6b6b6b; white-space: nowrap; padding-top: 0.03in; }
			.grid {
				display: flex; flex-wrap: wrap; align-content: flex-start;
				gap: ${inches(layout.gapIn)}; height: ${inches(layout.gridHeightIn - layout.gapIn * 0.5)};
			}
			.cell { margin: 0; height: ${inches(layout.cellHeightIn)}; display: flex; flex-direction: column; }
			/* The caption sits above its still, so a reader meets the name of a screen before the screen.
			   No fixed height on the still: it sits directly under its own caption, and the cell keeps
			   the row's height. */
			.shot {
				display: flex; align-items: flex-start; justify-content: center;
				max-height: ${inches(layout.stillHeightIn)};
			}
			.shot img {
				object-fit: contain; border: 0.5pt solid #b4b4b4; border-radius: 0.02in; background: #fff;
			}
			figcaption {
				height: ${inches(layout.captionHeightIn)}; padding-bottom: 0.06in;
				font-size: 8.5pt; line-height: 1.25; overflow: hidden; text-align: center;
			}
			figcaption b { font-weight: 700; }
			figcaption .note { display: block; color: #444; font-size: 7.5pt; }
			figcaption em { display: block; font-style: normal; color: #6b6b6b; font-size: 7pt; }
			.opener { display: flex; flex-direction: column; }
			.opener .number { margin: 0.5in 0 0; font-size: 40pt; font-weight: 700; line-height: 1; color: #b4b4b4; }
			.opener h2 { margin: 0.05in 0 0.1in; font-size: 24pt; line-height: 1.15; font-weight: 650; }
			.opener .summary { margin: 0 0 0.35in; font-size: 11pt; color: #555; max-width: 5.6in; }
			.opener .details { flex: 1; max-width: 5.6in; }
			.opener .details p { margin: 0 0 0.16in; font-size: 11pt; line-height: 1.5; }
			.opener .count { margin: 0; font-size: 7.5pt; color: #6b6b6b; border-top: 0.5pt solid #ddd; padding-top: 0.12in; }
			.cover { display: flex; flex-direction: column; }
			.cover h1 { font-size: 26pt; line-height: 1.1; margin: 0.3in 0 0.12in; font-weight: 650; }
			.cover .lede { font-size: 10pt; color: #444; margin: 0 0 0.3in; max-width: 5.4in; }
			.contents { list-style: none; margin: 0; padding: 0; flex: 1; }
			.contents li {
				display: flex; gap: 0.14in; align-items: baseline;
				padding: 0.075in 0; border-top: 0.5pt solid #ddd;
			}
			.contents .index { width: 0.24in; font-weight: 700; font-size: 10pt; }
			.contents .name { flex: 1; font-size: 10pt; }
			.contents .name em { display: block; font-style: normal; font-size: 7.5pt; color: #6b6b6b; }
			.contents .count { font-size: 7.5pt; color: #6b6b6b; white-space: nowrap; }
			.colophon {
				display: grid; grid-template-columns: 0.9in 1fr; gap: 0.03in 0.1in;
				font-size: 7.5pt; border-top: 0.5pt solid #ddd; padding-top: 0.12in; margin: 0;
			}
			.colophon dt { color: #6b6b6b; }
			.colophon dd { margin: 0; }
		`;
	}
}
