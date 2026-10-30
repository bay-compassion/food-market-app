import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { useTranslation } from '../../stores/react/use-translation';
import { GuestNextOpening } from './GuestNextOpening';
import { GuestSaturdayTimeline } from './GuestSaturdayTimeline';

const State = styled.div`
	display: grid;
	gap: 24px;
`;

const SupplyNote = styled.p`
	color: var(--color-text-muted);
	line-height: 1.5;
`;

/** The market is closed: when it next opens, and how a market Saturday runs. */
export const GuestNotOpenState = observer(function GuestNotOpenState() {
	const copy = useTranslation().guestView.notOpenState;

	return (
		<State className="state-message">
			<GuestNextOpening />
			<GuestSaturdayTimeline />
			<SupplyNote>{copy.supplyNote}</SupplyNote>
		</State>
	);
});
