import styled from '@emotion/styled';

import type { VisitStatusTranslations } from '@/locales.ts';

import type { NowCalling } from '../../../models/now-calling';
import type { QueueNumber } from '../../../models/queue-number';
import { useLinePositionIndicator } from '../../hooks/use-line-position-indicator';
import { NowCallingIndicator } from './NowCallingIndicator';
import { QueueNumberBoard } from './QueueNumberBoard';
import { QueuePositionDots } from './QueuePositionDots';
import { StandingCard } from './StandingCard';

const GuestsAhead = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;
	padding: 20px;
`;

const GuestsAheadCount = styled.div`
	display: inline-flex;
	align-items: baseline;
	gap: 8px;
	padding: 10px 18px;
	border: 1.5px solid color-mix(in srgb, var(--color-border) 45%, transparent);
	border-radius: var(--radius-lg);
	background: var(--color-background);

	strong {
		font-family: var(--font-heading);
		font-weight: 700;
		font-size: 26px;
		line-height: 1;
		color: var(--color-brand);
	}

	span {
		font-size: 14px;
		font-weight: 500;
		color: var(--color-text-muted);
	}
`;

export type QueueStandingProps = {
	copy: VisitStatusTranslations;
	queueNumber: QueueNumber;
	guestsAhead: number | null;
	nowCalling: NowCalling | null;
	className?: string;
};

/**
 * A waiting guest's place in line: their number on the board, the loudest thing on the card, and
 * under it whichever line position indicator the `line-position-indicator` flag selects. Shared by
 * the waiting card and the guided tour's preview of it, so the tour shows a guest the same display
 * their screen will.
 */
export function QueueStanding({
	copy,
	queueNumber,
	guestsAhead,
	nowCalling,
	className,
}: QueueStandingProps) {
	const indicator = useLinePositionIndicator();

	return (
		<StandingCard className={['queue-standing', className].filter(Boolean).join(' ')}>
			<QueueNumberBoard
				label={copy.yourNumberLabel}
				number={queueNumber}
				// Part of the guests-ahead fallback: it tells the guest how many are ahead of them, if
				// only that none are, which the default layout leaves out.
				note={indicator === 'guests-ahead' && guestsAhead === 0 ? copy.waiting.youAreNext : null}
			/>
			{indicator === 'now-calling' && nowCalling ? (
				<NowCallingIndicator copy={copy.waiting} nowCalling={nowCalling} />
			) : null}
			{guestsAhead !== null && guestsAhead > 0 && indicator === 'guests-ahead' ? (
				<GuestsAhead className="guests-ahead">
					{/* `linePosition` counts outward from the cart starting at 1 for the pip right next
					    to it — one slot further out than the number of guests ahead. */}
					<QueuePositionDots linePosition={guestsAhead + 1} />
					<GuestsAheadCount>
						<strong>{guestsAhead}</strong>
						<span>{copy.waiting.guestsAheadLabel}</span>
					</GuestsAheadCount>
				</GuestsAhead>
			) : null}
		</StandingCard>
	);
}
