import styled from '@emotion/styled';

import type { VisitStatusTranslations } from '@/locales.ts';

import { GuestVisitStatusPanel } from './GuestVisitStatusPanel';
import { QueuePositionDots } from './QueuePositionDots';

const CartLine = styled.div`
	margin-bottom: 27px;
`;

export function CalledVisitStatus({ copy }: { copy: VisitStatusTranslations['called'] }) {
	return (
		<GuestVisitStatusPanel
			icon="→"
			iconClassName="called-mark"
			tone="urgent"
			heading={copy.header}
			description={copy.details}
			details={
				<CartLine className="called-cart-line">
					{/* The guest has reached the cart itself, which `linePosition={0}` is what emphasizes —
					    there's no `guestsAhead` to read once the guest has been called. */}
					<QueuePositionDots linePosition={0} />
				</CartLine>
			}
		/>
	);
}
