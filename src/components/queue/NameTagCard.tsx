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
 * on a phone and the label at its real size are the same layout, scaled.
 */
const Tag = styled.figure`
	container-type: inline-size;
	display: grid;
	grid-template-rows: auto 1fr auto;
	aspect-ratio: ${widthMm} / ${heightMm};
	box-sizing: border-box;
	margin: 0;
	padding: 4cqi 5cqi;
	border: 2px solid var(--color-border);
	border-radius: var(--radius-md);
	color: var(--color-text);
	background: var(--color-background);

	figcaption {
		color: var(--color-text-subtle);
		font-size: 3.4cqi;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.name {
		align-self: center;
		margin: 0;
		overflow-wrap: anywhere;
		font-family: var(--font-heading);
		font-size: 14cqi;
		font-weight: 700;
		line-height: 1.05;
	}

	&[data-long-name='true'] .name {
		font-size: 10cqi;
	}

	.details {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 4cqi;
		margin: 0;
		font-size: 6.5cqi;
		font-weight: 700;
	}

	.position {
		color: var(--color-brand);
	}

	.language {
		padding: 0.5cqi 3cqi;
		border-radius: var(--radius-pill);
		background: var(--color-surface-soft);
		font-size: 4.8cqi;
		letter-spacing: 0.06em;
	}

	&[data-printed='true'] {
		width: ${widthMm}mm;
		height: ${heightMm}mm;
		border: 0;
		border-radius: 0;
		color: #000;
		background: #fff;
		grid-template-rows: 1fr auto;

		figcaption {
			display: none;
		}

		.position {
			color: #000;
		}

		.language {
			border: 0.6mm solid #000;
			background: none;
		}
	}
`;

/** The name tag for the guest whose ticket is open — to copy by hand, or as the label it prints. */
export function NameTagCard({ tag, printed = false }: NameTagCardProps) {
	const t = adminTranslations.en.queueDesk;

	return (
		<Tag className="name-tag" data-printed={printed} data-long-name={tag.isLongName}>
			<figcaption>{t.nameTag}</figcaption>
			<p className="name">{tag.name}</p>
			<p className="details">
				<span className="position">{tag.position === null ? t.unplaced : `#${tag.position}`}</span>
				<span className="language" title={t.language}>
					{tag.languageCode}
				</span>
			</p>
		</Tag>
	);
}
