import type { PrintLayout } from './print-layout.mjs';
import type { StillGroup } from './still-catalog.mjs';
import type { Still } from './still-photographer.mjs';

export type SheetSection = {
	group: StillGroup;
	stills: Still[];
};

export type SheetMeta = {
	title: string;
	generatedAt: Date;
	/** The commit the stills were shot from, so a marked-up print can be traced back to code. */
	revision: string;
	/** Either a single forced language, or a note that each story kept its own. */
	language: string;
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

/** `Guest/Session States/GuestVisitStatus` reads as `GuestVisitStatus` under a still. */
function componentOf(title: string): string {
	return title.split('/').at(-1) ?? title;
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

	/** Sheets of stills — the contents page in front of them is counted separately. */
	get sheetCount(): number {
		return this.sections.reduce((total, section) => total + this.pagesOf(section).length, 0);
	}

	toHtml(): string {
		return [
			`<!doctype html>`,
			`<html lang="en"><head><meta charset="utf-8">`,
			`<title>${escapeHtml(this.meta.title)}</title>`,
			`<style>${this.css()}</style>`,
			`</head><body>`,
			this.coverPage(),
			this.sections.map((section, index) => this.sectionPages(section, index + 1)).join('\n'),
			`</body></html>`,
		].join('\n');
	}

	private pagesOf(section: SheetSection): number[][] {
		return this.layout.paginate(section.stills.map((still) => this.layout.place(still)));
	}

	private coverPage(): string {
		const { layout, meta } = this;
		const contents = this.sections
			.map((section, index) => {
				const sheets = this.pagesOf(section).length;

				return `<li><span class="index">${index + 1}</span>
					<span class="name">${escapeHtml(section.group.title)}
						<em>${escapeHtml(section.group.summary)}</em></span>
					<span class="count">${section.stills.length} stills · ${sheets} sheet${sheets === 1 ? '' : 's'}</span>
				</li>`;
			})
			.join('\n');

		return `<article class="page cover">
			<h1>${escapeHtml(meta.title)}</h1>
			<p class="lede">Every state the app can be in, grouped by where it falls in a market day.
				Numbers are <b>group.still</b> — quote them when you mark a sheet up.</p>
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

	private sectionPages(section: SheetSection, groupNumber: number): string {
		const pages = this.pagesOf(section);

		return pages
			.map((indices, pageIndex) => {
				const cells = indices.map((index) => this.cell(section, index, groupNumber)).join('\n');

				return `<article class="page">
					<header class="running">
						<span class="group"><b>${groupNumber}</b> ${escapeHtml(section.group.title)}</span>
						<span class="sheet">Sheet ${pageIndex + 1} of ${pages.length}</span>
					</header>
					<div class="grid">${cells}</div>
				</article>`;
			})
			.join('\n');
	}

	private cell(section: SheetSection, index: number, groupNumber: number): string {
		const still = section.stills[index];

		if (!still) {
			return '';
		}

		const placed = this.layout.place(still);
		const cellWidth =
			placed.columnSpan === 1 ? this.layout.cellWidthIn : this.layout.contentWidthIn;
		const notes = [still.truncated ? 'cut off' : '', still.failed ? 'failed to render' : '']
			.filter(Boolean)
			.join(' · ');

		return `<figure class="cell" style="width:${inches(cellWidth)}">
			<div class="shot">
				<img src="${escapeHtml(still.file.split('\\').join('/'))}" alt=""
					style="width:${inches(placed.widthIn)};height:${inches(placed.heightIn)}">
			</div>
			<figcaption>
				<b>${groupNumber}.${index + 1}</b> ${escapeHtml(still.story.name)}
				<em>${escapeHtml(componentOf(still.story.title))}${notes ? ` · ${escapeHtml(notes)}` : ''}</em>
			</figcaption>
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
			.running .group { font-size: 10.5pt; letter-spacing: 0.01em; }
			.running .group b { font-weight: 700; margin-right: 0.06in; }
			.running .sheet { font-size: 7.5pt; color: #6b6b6b; white-space: nowrap; padding-top: 0.03in; }
			.grid {
				display: flex; flex-wrap: wrap; align-content: flex-start;
				gap: ${inches(layout.gapIn)}; height: ${inches(layout.gridHeightIn - layout.gapIn * 0.5)};
			}
			.cell { margin: 0; height: ${inches(layout.cellHeightIn)}; display: flex; flex-direction: column; }
			/* No fixed height: a caption sits directly under its own still, so a short one is never
			   stranded inches below the thing it names. The cell keeps the row's height. */
			.shot {
				display: flex; align-items: flex-start; justify-content: center;
				max-height: ${inches(layout.stillHeightIn)};
			}
			.shot img {
				object-fit: contain; border: 0.5pt solid #b4b4b4; border-radius: 0.02in; background: #fff;
			}
			figcaption {
				height: ${inches(layout.captionHeightIn)}; padding-top: 0.04in;
				font-size: 7.5pt; line-height: 1.25; overflow: hidden;
			}
			figcaption b { font-weight: 700; }
			figcaption em { display: block; font-style: normal; color: #6b6b6b; font-size: 6.5pt; }
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
