import styled from '@emotion/styled';
import type { ReactNode } from 'react';

import { boardColumns } from './board-columns';
import { useKioskLanguages } from './kiosk-languages';
import { KioskClock } from './KioskClock';

/* In landscape, the board's own columns: the screen's own note starts at the "Already Called"
   panel's left edge, with the clock across from it at the far side. In portrait the board is one
   column, so there the note sits at the centre of three, between equal outer tracks. */
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

	/* The note's lines align with each other on the left, across from the right-aligned clock. */
	> :first-child {
		text-align: left;
	}

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
	/** Beside the clock, at the "Already Called" panel's left edge, such as how many are in line. */
	end?: ReactNode;
};

/**
 * The strip across the top of every kiosk screen: the market's logo and name, whatever the screen
 * has to say, and the time at the far side.
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
				<div>{end}</div>
				<KioskClock />
			</Side>
		</Bar>
	);
}
