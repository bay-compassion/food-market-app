import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import type { ReactNode } from 'react';

import { useTranslation } from '../../stores/react/use-translation';
import { GuestSaturdayTimeline } from './GuestSaturdayTimeline';

const State = styled.div`
	display: grid;
	gap: 24px;
`;

const SupplyNote = styled.p`
	color: var(--color-text-muted);
	line-height: 1.5;
`;

/**
 * A guest with no visit to show — the market is closed, or today's registration has — sees their
 * status card, then how a market Saturday runs, so they know what to do next time.
 */
export const GuestNoVisitState = observer(function GuestNoVisitState({
	children,
}: {
	children: ReactNode;
}) {
	const copy = useTranslation().guestView.notOpenState;

	return (
		<State className="no-visit-state">
			{children}
			<GuestSaturdayTimeline />
			<SupplyNote>{copy.supplyNote}</SupplyNote>
		</State>
	);
});
