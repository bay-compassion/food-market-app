import styled from '@emotion/styled';

import { adminTranslations } from '../../adminLocales';
import type { NameTag } from '../../models/name-tag';

/**
 * Drawn at the proportions of a 2⅓ × 3⅜ in. adhesive name badge, so what a volunteer copies by hand
 * today is laid out the way a label printer would print it later.
 */
const Tag = styled.figure`
	display: grid;
	grid-template-rows: auto 1fr auto;
	aspect-ratio: 3.375 / 2.333;
	margin: 0;
	padding: 14px 18px;
	border: 2px solid var(--color-border);
	border-radius: var(--radius-md);
	color: var(--color-text);
	background: var(--color-background);

	figcaption {
		color: var(--color-text-subtle);
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.name {
		align-self: center;
		margin: 0;
		overflow-wrap: anywhere;
		font-family: var(--font-heading);
		font-size: clamp(32px, 11vw, 48px);
		font-weight: 700;
		line-height: 1.05;
	}

	.details {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 12px;
		margin: 0;
		font-size: 22px;
		font-weight: 700;
	}

	.position {
		color: var(--color-brand);
	}

	.language {
		padding: 2px 10px;
		border-radius: var(--radius-pill);
		background: var(--color-surface-soft);
		font-size: 16px;
		letter-spacing: 0.06em;
	}
`;

/** The name tag a check-in volunteer writes out for the guest whose ticket is open. */
export function NameTagCard({ tag }: { tag: NameTag }) {
	const t = adminTranslations.en.queueDesk;

	return (
		<Tag className="name-tag">
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
