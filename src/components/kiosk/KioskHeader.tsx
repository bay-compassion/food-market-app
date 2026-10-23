import styled from '@emotion/styled';
import type { ReactNode } from 'react';

import { boardColumns } from './board-columns';
import { useKioskLanguages } from './kiosk-languages';
import { KioskClock } from './KioskClock';

/* In landscape, the board's own columns: the clock starts at the "Already Called" panel's left
   edge, with the far side's text across from it. In portrait the board is one column, so there the
   clock sits at the centre of three, between equal outer tracks. */
const Bar = styled.header`
	display: grid;
	grid-template-columns: ${boardColumns.template};
	align-items: start;
	gap: 2vmin ${boardColumns.gap};
	padding-bottom: 3vmin;
	font-size: clamp(1.25rem, 3.5vmin, 2.75rem);
	font-weight: 500;

	> div > span {
		display: block;
	}

	/* Explicit sides: dir="auto" on a right-to-left second line would otherwise flip it. */
	> :first-child {
		text-align: left;
	}

	> :last-child {
		text-align: right;
	}

	[role='status'] {
		color: var(--color-focus);
	}

	@media (orientation: portrait) {
		grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
	}
`;

const Side = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: start;
	gap: 2vmin;

	@media (orientation: portrait) {
		display: contents;
	}
`;

/* The app bar's lockup — the logo beside the name in live type — at the display's scale. */
const Brand = styled.div`
	display: flex;
	align-items: center;
	gap: 0.5em;
	font-weight: 700;

	img {
		flex-shrink: 0;
		width: 1.8em;
		height: 1.8em;
		object-fit: contain;
		border-radius: 50%;
		box-shadow: 0 0 0 1px var(--color-on-brand);
	}
`;

export type KioskHeaderProps = {
	/** Under the market's name: a note on the display's own state, such as reconnecting. */
	status?: ReactNode;
	/** The right-hand side, opposite the market's name. */
	end?: ReactNode;
};

/**
 * The strip across the top of every kiosk screen: the market's logo and name, the time, and
 * whatever the screen has to say at the far side.
 */
export function KioskHeader({ status, end }: KioskHeaderProps) {
	const { primary } = useKioskLanguages();

	return (
		<Bar>
			<div>
				<Brand>
					<img src="/bay-compassion-icon-digital.svg" alt="" />
					{primary.marketName}
				</Brand>
				{status}
			</div>
			<Side>
				<KioskClock />
				<div>{end}</div>
			</Side>
		</Bar>
	);
}
