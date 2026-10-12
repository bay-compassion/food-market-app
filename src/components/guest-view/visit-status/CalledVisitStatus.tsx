import styled from '@emotion/styled';

import type { VisitStatusTranslations } from '@/locales.ts';

import type { NowCalling } from '../../../models/now-calling';
import type { QueueNumber } from '../../../models/queue-number';
import { useLinePositionIndicator } from '../../hooks/use-line-position-indicator';
import { GuestVisitStatusPanel } from './GuestVisitStatusPanel';
import { NowCallingIndicator } from './NowCallingIndicator';
import { QueueNumberBoard } from './QueueNumberBoard';
import { QueuePositionDots } from './QueuePositionDots';
import { StandingCard } from './StandingCard';
import { VisitTicketStamp } from './VisitTicketStamp';

const CartLine = styled.div`
	margin-bottom: 27px;
`;

export type CalledVisitStatusProps = {
	copy: VisitStatusTranslations;
	/** The guest's number, or `null` for a visit called without one. */
	queueNumber: QueueNumber | null;
	/** The numbers being called now, or `null` when the server sent none. */
	nowCalling: NowCalling | null;
};

/**
 * "It's your turn": the guest's number on the same board they watched while waiting, in the "go"
 * colour — what they hold up at the entrance, and what the worker checks against the line.
 *
 * Under it, with the `now-calling` indicator, the same "now calling" row as the waiting card. Some
 * guests come late or take their time: once the market has called `NowCalling.lateThreshold`
 * numbers past theirs, the board starts to warm toward yellow, like the registration countdown
 * running out, faster with every number after. A screen reader hears the count instead.
 */
export function CalledVisitStatus({ copy, queueNumber, nowCalling }: CalledVisitStatusProps) {
	const indicator = useLinePositionIndicator();
	const showNowCalling = indicator === 'now-calling' && nowCalling !== null;
	const numbersSince =
		showNowCalling && queueNumber ? (nowCalling.numbersSince(queueNumber) ?? 0) : 0;
	const warmth = showNowCalling && queueNumber ? nowCalling.warmthSince(queueNumber) : 0;

	return (
		<GuestVisitStatusPanel
			icon="→"
			iconClassName="called-mark"
			tone="action"
			heading={copy.called.header}
			description={copy.called.details}
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
							{showNowCalling ? (
								<NowCallingIndicator copy={copy.waiting} nowCalling={nowCalling} />
							) : null}
							{/* Only once the board has started to warm: before then a sighted guest sees
							    nothing, so a screen reader hears nothing either. */}
							{warmth > 0 ? (
								<span className="sr-only">
									{(numbersSince === 1
										? copy.called.sinceYoursOne
										: copy.called.sinceYoursOther
									).replace('{count}', String(numbersSince))}
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
