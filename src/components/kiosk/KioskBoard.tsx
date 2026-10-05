import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';

import type { QueueBoard } from '../../models/queue-board';
import { Bilingual, useKioskLanguages } from './kiosk-languages';
import { LanguageIndicator } from './LanguageIndicator';
import { UnclaimedNumbers } from './UnclaimedNumbers';

const announce = keyframes`
	0%, 100% { color: var(--color-on-brand); transform: scale(1); }
	50% { color: var(--color-focus); transform: scale(1.06); }
`;

const Layout = styled.div<{ $split: boolean }>`
	display: grid;
	flex: 1;
	grid-template-columns: ${({ $split }) => ($split ? '3fr 2fr' : '1fr')};
	grid-template-rows: minmax(0, 1fr);
	gap: 5vmin;
	min-height: 0;

	@media (orientation: portrait) {
		grid-template-columns: 1fr;
		grid-template-rows: ${({ $split }) =>
			$split ? 'minmax(0, 3fr) minmax(0, 2fr)' : 'minmax(0, 1fr)'};
	}
`;

const NowCalling = styled.section`
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;

	h1,
	p {
		/* Explicit, so a right-to-left second line stays centred under the English. */
		text-align: center;
	}

	h1 {
		margin: 0;
		font-size: clamp(2rem, 7vmin, 6rem);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	strong {
		display: flex;
		flex-direction: column;
		align-items: center;
		font-weight: 700;
		line-height: 1;
		font-variant-numeric: tabular-nums;
		animation: ${announce} 1.2s ease-in-out 3;

		@media (prefers-reduced-motion: reduce) {
			animation: none;
		}
	}

	/* Shrinks to make room when the language's own digits sit underneath. */
	strong > span:first-of-type {
		font-size: clamp(8rem, 42vmin, 36rem);
	}

	strong[data-native] > span:first-of-type {
		font-size: clamp(6rem, 30vmin, 26rem);
	}

	/* Roboto has no Arabic-script digits, so these come from a fallback font, which may have no bold
	   face; base.css turns synthesis off globally, which would leave them thin across the room. */
	strong > span + span {
		margin-top: 1vmin;
		font-size: clamp(4rem, 18vmin, 16rem);
		font-synthesis: weight;
	}

	p {
		margin: 4vmin 0 0;
		font-size: clamp(1.5rem, 5vmin, 4rem);
		font-weight: 500;
	}
`;

const Header = styled.header`
	display: flex;
	justify-content: space-between;
	align-items: start;
	gap: 2vmin 5vmin;
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
`;

const Footer = styled.footer`
	padding-top: 3vmin;
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
 * Every line is English with the rotating language under it. The number is keyed on itself so its
 * highlight replays each time a new one is called — the flash across the room is what makes a
 * guest look up. While the rotating language is Arabic or Farsi it is also written in that
 * language's own digits, since guests read one set or the other but not always both.
 */
export function KioskBoard({ board, reconnecting }: KioskBoardProps) {
	const { primary, secondary } = useKioskLanguages();
	const native = secondary?.numerals.hasNativeDigits ? secondary : null;
	const { nowCalling, stillWaitingFor } = board;

	return (
		<>
			<Header>
				<div>
					<span>{primary.marketName}</span>
					{reconnecting ? (
						<span role="status">
							<Bilingual text={(copy) => copy.reconnecting} />
						</span>
					) : null}
				</div>
				<div>
					<Bilingual
						text={(copy, numerals) =>
							copy.waitingCount.replace('{count}', numerals.inline(board.waitingCount))
						}
					/>
				</div>
			</Header>
			<Layout $split={stillWaitingFor.length > 0}>
				<NowCalling aria-live="polite">
					<h1>
						<Bilingual text={(copy) => copy.nowCalling} />
					</h1>
					{nowCalling === null ? (
						<p>
							<Bilingual text={(copy) => copy.nowCallingNone} />
						</p>
					) : (
						<strong key={nowCalling} data-native={native ? true : undefined}>
							<span>{nowCalling}</span>
							{native ? (
								<span lang={native.locale}>{native.numerals.nativeOf(nowCalling)}</span>
							) : null}
						</strong>
					)}
				</NowCalling>
				{stillWaitingFor.length > 0 ? (
					// A new language can change every tile's size, so start the fitting over.
					<UnclaimedNumbers key={secondary?.locale ?? 'en'} numbers={stillWaitingFor} />
				) : null}
			</Layout>
			<Footer>
				<LanguageIndicator />
			</Footer>
		</>
	);
}
