import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import type { QueueBoard } from '../../models/queue-board';
import { useTranslation } from '../../stores/react/use-translation';

const announce = keyframes`
	0%, 100% { color: var(--color-on-brand); transform: scale(1); }
	50% { color: var(--color-focus); transform: scale(1.06); }
`;

const Layout = styled.div<{ $split: boolean }>`
	display: grid;
	flex: 1;
	grid-template-columns: ${({ $split }) => ($split ? '3fr 2fr' : '1fr')};
	gap: 5vmin;
	min-height: 0;

	@media (orientation: portrait) {
		grid-template-columns: 1fr;
		grid-template-rows: ${({ $split }) => ($split ? '3fr 2fr' : '1fr')};
	}
`;

const NowCalling = styled.section`
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;

	h1 {
		margin: 0;
		font-size: clamp(2rem, 7vmin, 6rem);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	strong {
		display: block;
		font-size: clamp(8rem, 42vmin, 36rem);
		font-weight: 700;
		line-height: 1;
		font-variant-numeric: tabular-nums;
		animation: ${announce} 1.2s ease-in-out 3;

		@media (prefers-reduced-motion: reduce) {
			animation: none;
		}
	}

	p {
		margin: 4vmin 0 0;
		font-size: clamp(1.5rem, 5vmin, 4rem);
		font-weight: 500;
	}
`;

const StillWaiting = styled.section`
	display: flex;
	flex-direction: column;
	gap: 3vmin;
	padding: 4vmin;
	border-radius: var(--radius-lg);
	background: rgb(255 255 255 / 8%);
	overflow: hidden;

	h2 {
		margin: 0;
		font-size: clamp(1.5rem, 4.5vmin, 3.5rem);
		font-weight: 600;
		line-height: 1.2;
	}

	ul {
		display: flex;
		flex-wrap: wrap;
		align-content: flex-start;
		gap: 2.5vmin;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		min-width: 2.6ch;
		padding: 1vmin 2.5vmin;
		border-radius: var(--radius-md);
		background: var(--color-focus);
		color: var(--color-brand-dark);
		font-size: clamp(2.5rem, 10vmin, 8rem);
		font-weight: 700;
		line-height: 1.1;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}
`;

const Footer = styled.footer`
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	gap: 2vmin 5vmin;
	padding-top: 3vmin;
	font-size: clamp(1.25rem, 3.5vmin, 2.75rem);
	font-weight: 500;

	[role='status'] {
		color: var(--color-focus);
	}
`;

export type KioskBoardProps = {
	board: QueueBoard;
	/** The latest read failed; the board on screen is the last one that succeeded. */
	reconnecting: boolean;
};

/**
 * The room display while numbers are being called: the number called now, filling most of the
 * screen, and beside it the numbers called earlier that have not come to the table yet.
 *
 * The number is keyed on itself so its highlight replays each time a new one is called — the
 * flash across the room is what makes a guest look up.
 */
export const KioskBoard = observer(function KioskBoard({ board, reconnecting }: KioskBoardProps) {
	const t = useTranslation();
	const copy = t.kiosk;
	const { nowCalling, stillWaitingFor } = board;

	return (
		<>
			<Layout $split={stillWaitingFor.length > 0}>
				<NowCalling aria-live="polite">
					<h1>{copy.nowCalling}</h1>
					{nowCalling === null ? (
						<p>{copy.nowCallingNone}</p>
					) : (
						<strong key={nowCalling}>{nowCalling}</strong>
					)}
				</NowCalling>
				{stillWaitingFor.length > 0 ? (
					<StillWaiting aria-labelledby="kiosk-still-waiting">
						<h2 id="kiosk-still-waiting">{copy.stillWaitingFor}</h2>
						<ul>
							{stillWaitingFor.map((position) => (
								<li key={position}>{position}</li>
							))}
						</ul>
					</StillWaiting>
				) : null}
			</Layout>
			<Footer>
				<span>{t.marketName}</span>
				{reconnecting ? <span role="status">{copy.reconnecting}</span> : null}
				<span>{copy.waitingCount.replace('{count}', String(board.waitingCount))}</span>
			</Footer>
		</>
	);
});
