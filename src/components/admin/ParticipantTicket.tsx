import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import type { QueueGuest } from '../../services/admin-api';
import { adminVisitStatusLabels } from '../../services/visitStatusLabels';
import { TicketFacts } from '../queue/TicketFacts';
import { TicketHistory } from '../queue/TicketHistory';
import { TicketSummary } from '../queue/TicketSummary';
import { StatusCorrectionActions } from './StatusCorrectionActions';

const Details = styled.div`
	display: grid;
	gap: 14px;

	.who {
		display: grid;
		gap: 4px;
	}

	.name {
		margin: 0;
		font-family: var(--font-heading);
		font-size: 22px;
		font-weight: 700;
	}
`;

/**
 * An ended session's open ticket, laid out like the queue's: the number and how the visit
 * finished, who the guest is, correcting the status, and what happened, correction included.
 */
export const ParticipantTicket = observer(function ParticipantTicket({
	guest,
}: {
	guest: QueueGuest;
}) {
	const statusLabels = adminVisitStatusLabels('en');

	return (
		<Details>
			<TicketSummary guest={guest} statusLabel={statusLabels[guest.status]} />
			{/* The queue's name tag card names the guest; a finished visit has no tag left to write. */}
			<div className="who">
				<p className="name">{`${guest.firstName} ${guest.lastName}`.trim()}</p>
				<TicketFacts guest={guest} />
			</div>
			<StatusCorrectionActions guest={guest} />
			<TicketHistory />
		</Details>
	);
});
