import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import type { QueueGuest } from '../../services/admin-api';
import { adminVisitStatusLabels } from '../../services/visitStatusLabels';
import { TicketActions } from './TicketActions';
import { TicketFacts } from './TicketFacts';
import { TicketGuestDetails } from './TicketGuestDetails';
import { TicketHistory } from './TicketHistory';
import { TicketNameTag } from './TicketNameTag';
import { TicketSummary } from './TicketSummary';

const Details = styled.div`
	display: grid;
	gap: 14px;
`;

/**
 * Everything on an open ticket: its number and clock, the name tag to write out, what to do next,
 * and what has happened so far. The phone's sheet and the desk's pane both show it.
 */
export const TicketDetails = observer(function TicketDetails({ guest }: { guest: QueueGuest }) {
	const statusLabels = adminVisitStatusLabels('en');

	return (
		<Details>
			<TicketSummary guest={guest} statusLabel={statusLabels[guest.status]} />
			<TicketNameTag guest={guest} />
			<TicketFacts guest={guest} />
			<TicketActions guest={guest} />
			{/* Keyed by guest, so opening another ticket starts its form afresh. */}
			<TicketGuestDetails key={guest.guestId} guest={guest} />
			<TicketHistory />
		</Details>
	);
});
