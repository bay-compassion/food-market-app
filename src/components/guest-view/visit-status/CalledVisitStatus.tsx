import styled from '@emotion/styled';

import type { VisitStatusTranslations } from '@/locales.ts';

import type { QueueNumber } from '../../../models/queue-number';
import { useLinePositionIndicator } from '../../hooks/use-line-position-indicator';
import { GuestVisitStatusPanel } from './GuestVisitStatusPanel';
import { QueueNumberBoard } from './QueueNumberBoard';
import { QueuePositionDots } from './QueuePositionDots';
import { VisitTicketStamp } from './VisitTicketStamp';

const CartLine = styled.div`
	margin-bottom: 27px;
`;

/* Rounded like the waiting card's standing, which the board sits in there. */
const NumberBoard = styled(QueueNumberBoard)`
	margin-bottom: 27px;
	border-radius: var(--radius-md);
`;

export type CalledVisitStatusProps = {
	copy: VisitStatusTranslations;
	/** The guest's number, or `null` for a visit called without one. */
	queueNumber: QueueNumber | null;
};

export function CalledVisitStatus({ copy, queueNumber }: CalledVisitStatusProps) {
	// Only the `guests-ahead` indicator has a called-state counterpart: the now-calling row would
	// just repeat the guest's own number, which the board already shows.
	const showLinePositionIndicator = useLinePositionIndicator() === 'guests-ahead';

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
					{/* The same board the guest watched while waiting, in the "go" colour: what they hold
					    up at the entrance, and what the worker checks against the line. */}
					{queueNumber ? (
						<NumberBoard label={copy.yourNumberLabel} number={queueNumber} tone="action" />
					) : null}
					{showLinePositionIndicator ? (
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
