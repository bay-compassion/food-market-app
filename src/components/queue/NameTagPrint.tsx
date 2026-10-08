import { css, Global } from '@emotion/react';
import { createPortal } from 'react-dom';

import { NameTag } from '../../models/name-tag';
import { NameTagCard } from './NameTagCard';

const { widthMm, heightMm } = NameTag.label;

/**
 * While the print station has a tag to print, printing the page prints that tag and nothing else:
 * the page is the label's size with no margins, and everything on it but the label is hidden.
 * Mounted only while a tag is waiting, so these rules never apply to any other screen.
 */
const printOnlyTheLabel = css`
	@page {
		size: ${widthMm}mm ${heightMm}mm;
		margin: 0;
	}

	@media print {
		html,
		body {
			margin: 0;
			padding: 0;
			background: #fff;
		}

		body > :not(.name-tag-print) {
			display: none !important;
		}
	}

	@media screen {
		.name-tag-print {
			display: none;
		}
	}
`;

/**
 * A name tag at its real size, laid out for the label printer. It sits directly in `<body>` so the
 * print rules can hide every other part of the page.
 */
export function NameTagPrint({ tag }: { tag: NameTag }) {
	return createPortal(
		<div className="name-tag-print">
			<Global styles={printOnlyTheLabel} />
			<NameTagCard tag={tag} printed />
		</div>,
		document.body,
	);
}
