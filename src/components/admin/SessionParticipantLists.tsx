import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import type { SessionParticipants } from '../../models/session-participants';
import type { AdminGuest } from '../../services/admin-api';
import { adminVisitStatusLabels } from '../../services/visitStatusLabels';
import { TicketSection } from '../queue/TicketSection';

const Lists = styled.div`
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	gap: 12px;
`;

/** An ended session's guests as the queue lists them: a folding section of tickets per status. */
export const SessionParticipantLists = observer(function SessionParticipantLists({
	participants,
}: {
	participants: SessionParticipants<AdminGuest>;
}) {
	const labels = adminVisitStatusLabels('en');
	// Nobody is timed in an ended session; the chips only need a clock to say so.
	const now = Date.now();

	return (
		<Lists>
			{participants.groups.map((group) => (
				<TicketSection
					key={group.status}
					id={group.status}
					title={labels[group.status]}
					guests={group.guests}
					now={now}
				/>
			))}
		</Lists>
	);
});
