import styled from '@emotion/styled';
import type { CSSProperties, ReactNode } from 'react';

import type { QueueNumber } from '../../../models/queue-number';

/** `brand` while the guest waits; `action` once it is their turn, matching the called mark. */
export type QueueNumberBoardTone = 'brand' | 'action';

const toneBackgrounds: Record<QueueNumberBoardTone, string> = {
	brand: 'var(--color-brand-dark)',
	action: 'var(--color-success)',
};

/**
 * From this much warmth the board's text turns dark. Measured on the green-to-yellow blend: white
 * holds 4.5:1 up to about a quarter of the way, dark text from just past it.
 */
const darkTextFrom = 0.28;

/**
 * Blends toward yellow by `--queue-number-board-warmth`, as the registration countdown blends
 * toward its warning colour: `color-mix()` computes it, rather than snapping between swatches. The
 * text switches from white to dark where each stops passing contrast (`darkTextFrom`).
 */
const Board = styled.div<{ $tone: QueueNumberBoardTone; $darkText: boolean }>`
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
	padding: 22px 20px 24px;
	background: color-mix(
		in oklch,
		${({ $tone }) => toneBackgrounds[$tone]},
		var(--color-focus) calc(var(--queue-number-board-warmth, 0) * 100%)
	);
	color: ${({ $darkText }) => ($darkText ? 'var(--color-text)' : 'var(--color-on-brand)')};

	> span {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}

	svg {
		flex: 0 0 auto;
		width: 14px;
		height: 14px;
	}

	strong {
		font-family: var(--font-heading);
		font-weight: 700;
		font-size: 84px;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	/* A div, not a p: GuestVisitStatusPanel styles every paragraph inside it as muted body copy,
	   which would vanish against this board. */
	div {
		margin-top: 6px;
		font-size: 16px;
		font-weight: 700;
	}
`;

export type QueueNumberBoardProps = {
	label: string;
	number: QueueNumber;
	tone?: QueueNumberBoardTone;
	/** A line under the number, such as "You are next". */
	note?: ReactNode;
	/**
	 * How far the board has warmed toward yellow, `0`–`1` — for a called guest the market has moved
	 * on from (`NowCalling.warmthSince`).
	 */
	warmth?: number;
	className?: string;
};

/**
 * The guest's own number, as the loudest thing on their card: what they carry all day, and what a
 * worker at the entrance checks. The same board on the waiting and the called card, so the screen
 * a guest shows at the door is the one they have been watching.
 */
export function QueueNumberBoard({
	label,
	number,
	tone = 'brand',
	note,
	warmth = 0,
	className,
}: QueueNumberBoardProps) {
	const warm = warmth > 0;

	return (
		<Board
			className={['queue-number-board', className].filter(Boolean).join(' ')}
			data-warmth={warmth}
			$tone={tone}
			$darkText={warmth >= darkTextFrom}
			style={{ '--queue-number-board-warmth': warmth } as CSSProperties}
		>
			<span>
				{/* Colour alone does not reliably read as "the line has moved on" for every guest, so the
				    countdown's warning mark goes with it, as a signal that is not colour. */}
				{warm ? (
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						aria-hidden="true"
					>
						<path d="M12 3 2 20h20L12 3Z" strokeLinejoin="round" strokeLinecap="round" />
						<path d="M12 10v4" strokeLinecap="round" />
						<path d="M12 17h.01" strokeLinecap="round" />
					</svg>
				) : null}
				{label}
			</span>
			<strong>{number.label}</strong>
			{note ? <div>{note}</div> : null}
		</Board>
	);
}
