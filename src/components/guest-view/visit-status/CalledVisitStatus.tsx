import styled from '@emotion/styled';

import type { VisitStatusTranslations } from '@/locales.ts';

import { useLinePositionIndicator } from '../../hooks/use-line-position-indicator';
import { GuestVisitStatusPanel } from './GuestVisitStatusPanel';
import { QueuePositionDots } from './QueuePositionDots';
import { VisitTicketStamp } from './VisitTicketStamp';

const CartLine = styled.div`
	margin-bottom: 27px;
`;

export function CalledVisitStatus({ copy }: { copy: VisitStatusTranslations['called'] }) {
	// Only the `guests-ahead` indicator has a called-state counterpart: the now-calling board would
	// just show the guest their own number, which the "it's your turn" panel already says.
	const showLinePositionIndicator = useLinePositionIndicator() === 'guests-ahead';

	return (
		<GuestVisitStatusPanel
			icon="→"
			iconClassName="called-mark"
			tone="action"
			heading={copy.header}
			description={copy.details}
			details={
				<>
					<VisitTicketStamp />
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
