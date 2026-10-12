import styled from '@emotion/styled';
import type { ReactNode } from 'react';

import type { QueueNumber } from '../../../models/queue-number';

/** `brand` while the guest waits; `action` once it is their turn, matching the called mark. */
export type QueueNumberBoardTone = 'brand' | 'action';

const toneBackgrounds: Record<QueueNumberBoardTone, string> = {
	brand: 'var(--color-brand-dark)',
	action: 'var(--color-success)',
};

const Board = styled.div<{ $tone: QueueNumberBoardTone }>`
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
	padding: 22px 20px 24px;
	background: ${({ $tone }) => toneBackgrounds[$tone]};
	color: var(--color-on-brand);

	span {
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.03em;
		text-transform: uppercase;
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
	className,
}: QueueNumberBoardProps) {
	return (
		<Board className={['queue-number-board', className].filter(Boolean).join(' ')} $tone={tone}>
			<span>{label}</span>
			<strong>{number.label}</strong>
			{note ? <div>{note}</div> : null}
		</Board>
	);
}
