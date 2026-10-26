import styled from '@emotion/styled';

import { adminTranslations } from '../../adminLocales';
import { NameTag } from '../../models/name-tag';

export type NameTagCardProps = {
	tag: NameTag;
	/**
	 * Laid out for the label printer: exactly the label's size in millimetres, in black only (the
	 * printer is thermal, so a tint would come out as speckle), and without the on-screen caption.
	 */
	printed?: boolean;
};

const { widthMm, heightMm } = NameTag.label;

/**
 * Every size is in container units, so the tag keeps the same proportions at any width: the card
 * on a phone and the label at its real size are the same layout, scaled. The figure itself is the
 * container, so its own box is sized without them — a container unit on the container resolves
 * against whatever encloses it (the page, on the print station), not the label — and the layout's
 * padding and columns sit on the grid inside it.
 *
 * The name reads first, on the left; the number sits in a solid block down the right edge, large
 * enough to read across a room, with the language under it. The date and the visit's reference
 * code run along the foot.
 */
const Tag = styled.figure`
	container-type: inline-size;
	display: flex;
	flex-direction: column;
	aspect-ratio: ${widthMm} / ${heightMm};
	box-sizing: border-box;
	margin: 0;
	border: 2px solid var(--color-border);
	border-radius: var(--radius-md);
	color: var(--color-text);
	background: var(--color-background);

	figcaption {
		padding: 2.4cqi 5cqi 0;
		color: var(--color-text-subtle);
		font-size: 3.4cqi;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.layout {
		flex: 1;
		display: grid;
		grid-template-areas:
			'spoken number'
			'details number';
		grid-template-columns: minmax(0, 1fr) 35cqi;
		grid-template-rows: minmax(0, 1fr) auto;
		gap: 1.6cqi 2.9cqi;
		min-height: 0;
		/* Wide at the sides: the LabelWriter can't print right up to the label's left and right edges. */
		padding: 2.4cqi 5cqi;
	}

	.spoken {
		grid-area: spoken;
		display: grid;
		align-content: center;
		gap: 1.3cqi;
		min-height: 0;
		padding-inline-start: 0.8cqi;
	}

	.name {
		display: -webkit-box;
		margin: 0;
		overflow: hidden;
		overflow-wrap: break-word;
		font-family: var(--font-heading);
		font-size: 11cqi;
		font-weight: 700;
		/* Room above the cap height, so a clamped line keeps its diacritics (Nguyễn). */
		line-height: 1.2;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
	}

	&[data-long-name='true'] .name {
		font-size: 8cqi;
	}

	/* Up to the field's 100 characters; two lines is all the label has room for. */
	.pronunciation {
		display: -webkit-box;
		margin: 0;
		overflow: hidden;
		color: var(--color-text-muted);
		font-size: 5.2cqi;
		font-style: italic;
		line-height: 1.2;
		overflow-wrap: break-word;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
	}

	.number {
		grid-area: number;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 1cqi;
		min-height: 0;
		margin: 0;
		border-radius: 2.9cqi;
		color: var(--color-on-brand);
		background: var(--color-brand);
		text-align: center;
	}

	.position {
		font-size: 25cqi;
		font-weight: 700;
		line-height: 0.95;
		letter-spacing: -0.03em;
	}

	&[data-number-length='medium'] .position {
		font-size: 18cqi;
	}

	&[data-number-length='long'] .position {
		font-size: 14cqi;
	}

	&[data-unplaced='true'] .position {
		padding-inline: 2cqi;
		font-size: 5.5cqi;
		letter-spacing: 0;
	}

	.language {
		font-size: 8.5cqi;
		font-weight: 700;
		letter-spacing: 0.1em;
	}

	.details {
		grid-area: details;
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 3cqi;
		margin: 0;
		padding: 1.3cqi 0 0 0.8cqi;
		border-top: 0.4cqi solid currentColor;
		font-size: 3.9cqi;
		font-weight: 500;
	}

	.date {
		font-weight: 700;
	}

	.reference-code {
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
		font-weight: 700;
		letter-spacing: 0.08em;
	}

	&[data-printed='true'] {
		width: ${widthMm}mm;
		height: ${heightMm}mm;
		border: 0;
		border-radius: 0;
		color: #000;
		background: #fff;

		figcaption {
			display: none;
		}

		.pronunciation {
			color: #000;
		}

		/*
		 * A browser leaves backgrounds out of a print unless told otherwise, which would print the
		 * number white on white. Kiosk printing never shows the dialog's "background graphics" box.
		 */
		.number {
			color: #fff;
			background: #000;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
	}
`;

/** The name tag for the guest whose ticket is open — to copy by hand, or as the label it prints. */
export function NameTagCard({ tag, printed = false }: NameTagCardProps) {
	const t = adminTranslations.en.queueDesk;

	return (
		<Tag
			className="name-tag"
			data-printed={printed}
			data-long-name={tag.isLongName}
			data-number-length={tag.numberLength}
			data-unplaced={tag.number === null}
		>
			<figcaption>{t.nameTag}</figcaption>
			<div className="layout">
				<div className="spoken">
					<p className="name">{tag.name}</p>
					{tag.pronunciation ? (
						<p className="pronunciation" title={t.pronunciation}>
							{tag.pronunciation}
						</p>
					) : null}
				</div>
				<p className="number">
					<span className="position">{tag.number === null ? t.unplaced : tag.number.label}</span>
					<span className="language" title={t.language}>
						{tag.languageCode}
					</span>
				</p>
				<p className="details">
					<span className="date">{tag.date}</span>
					<span className="reference" title={t.referenceHelp}>
						{t.reference} <span className="reference-code">{tag.reference}</span>
					</span>
				</p>
			</div>
		</Tag>
	);
}
