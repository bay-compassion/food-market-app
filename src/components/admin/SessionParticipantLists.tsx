import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminVisitStatusLabels } from '../../services/visitStatusLabels';
import { useRootStore } from '../../stores/react/store-context';
import { TicketSection } from '../queue/TicketSection';
import { SectionSelectButton } from './SectionSelectButton';

const Lists = styled.div`
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	gap: 12px;
`;

/**
 * An ended session's guests as the queue lists them: a folding section of tickets per status, each
 * of which can be picked out whole while selecting, in the order the volunteer chose.
 */
export const SessionParticipantLists = observer(function SessionParticipantLists() {
	const { groups } = useRootStore().admin.sessionParticipants;
	const labels = adminVisitStatusLabels('en');
	// Nobody is timed in an ended session; the chips only need a clock to say so.
	const now = Date.now();

	return (
		<Lists>
			{groups.map((group) => (
				<TicketSection
					key={group.status}
					id={group.status}
					title={labels[group.status]}
					guests={group.guests}
					now={now}
					action={<SectionSelectButton guests={group.guests} statusLabel={labels[group.status]} />}
				/>
			))}
		</Lists>
	);
});
