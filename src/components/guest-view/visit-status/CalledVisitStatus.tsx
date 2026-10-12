import styled from '@emotion/styled';

import type { VisitStatusTranslations } from '@/locales.ts';

import type { LateArrival } from '../../../models/late-arrival';
import type { NowCalling } from '../../../models/now-calling';
import type { QueueNumber } from '../../../models/queue-number';
import { useLinePositionIndicator } from '../../hooks/use-line-position-indicator';
import { useNow } from '../../hooks/use-now';
import { GuestVisitStatusPanel } from './GuestVisitStatusPanel';
import { NowCallingIndicator } from './NowCallingIndicator';
import { QueueNumberBoard } from './QueueNumberBoard';
import { QueuePositionDots } from './QueuePositionDots';
import { StandingCard } from './StandingCard';
import { VisitTicketStamp } from './VisitTicketStamp';

const CartLine = styled.div`
	margin-bottom: 27px;
`;

/** How often the board's warmth is recomputed; the board's own transition glides between ticks. */
const warmthTickMs = 5_000;

export type CalledVisitStatusProps = {
	copy: VisitStatusTranslations;
	/** The guest's number, or `null` for a visit called without one. */
	queueNumber: QueueNumber | null;
	/** The numbers being called now, or `null` when the server sent none. */
	nowCalling: NowCalling | null;
	/** When the guest was called, or `null` when that is not known. */
	lateArrival: LateArrival | null;
};

/**
 * "It's your turn": the guest's number on the same board they watched while waiting, in the "go"
 * colour — what they hold up at the check-in desk, and what the worker checks against the line.
 * Under it, with the `now-calling` indicator, the same "now calling" row as the waiting card.
 *
 * A guest's turn never expires, but others are waiting behind them. Once `LateArrival.graceMs` has
 * passed since the call, the board warms toward yellow, like the registration countdown running
 * out, faster with every minute; fully yellow, the card says in words that others are waiting. A
 * screen reader hears how long ago they were called instead of the colour.
 */
export function CalledVisitStatus({
	copy,
	queueNumber,
	nowCalling,
	lateArrival,
}: CalledVisitStatusProps) {
	const indicator = useLinePositionIndicator();
	// Ticks only while the board can still change: once it is fully yellow there is nothing to move.
	const now = useNow(lateArrival && !lateArrival.isLateAt(Date.now()) ? warmthTickMs : null);
	const warmth = lateArrival ? lateArrival.warmthAt(now) : 0;
	const isLate = lateArrival ? lateArrival.isLateAt(now) : false;
	const minutes = lateArrival ? lateArrival.minutesSince(now) : 0;

	return (
		<GuestVisitStatusPanel
			icon="→"
			iconClassName="called-mark"
			tone="action"
			heading={copy.called.header}
			description={isLate ? copy.called.detailsLate : copy.called.details}
			details={
				<>
					<VisitTicketStamp />
					{queueNumber ? (
						<StandingCard className="called-standing">
							<QueueNumberBoard
								label={copy.yourNumberLabel}
								number={queueNumber}
								tone="action"
								warmth={warmth}
							/>
							{indicator === 'now-calling' && nowCalling ? (
								<NowCallingIndicator copy={copy.waiting} nowCalling={nowCalling} />
							) : null}
							{/* Only once the board has started to warm: before then a sighted guest sees
							    nothing, so a screen reader hears nothing either. */}
							{warmth > 0 ? (
								<span className="sr-only">
									{(minutes === 1
										? copy.called.calledMinutesAgoOne
										: copy.called.calledMinutesAgoOther
									).replace('{minutes}', String(minutes))}
								</span>
							) : null}
						</StandingCard>
					) : null}
					{indicator === 'guests-ahead' ? (
						<CartLine className="called-cart-line">
							{/* The guest has reached the cart itself, which `linePosition={0}` is what emphasizes
							    — there's no `guestsAhead` to read once the guest has been called. */}
							<QueuePositionDots linePosition={0} />
						</CartLine>
					) : null}
				</>
			}
		/>
	);
}
