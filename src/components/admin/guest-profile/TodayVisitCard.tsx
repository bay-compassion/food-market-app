import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../../adminLocales';
import type { AdminGuest } from '../../../services/admin-api';
import type { VisitCommand } from '../../../services/visitStateMachine';
import { adminVisitStatusLabels } from '../../../services/visitStatusLabels';
import { useRootStore } from '../../../stores/react/store-context';
import { TicketSummary } from '../../queue/TicketSummary';
import { QueueGuestActions } from '../QueueGuestActions';

const Card = styled.section`
	display: grid;
	gap: 10px;

	h3 {
		margin: 0;
		font-family: var(--font-heading);
		font-size: 18px;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
	}
`;

/**
 * The guest's visit in the session open now: the queue's own ticket summary, and the queue's own
 * actions for it, so calling or serving them from here is the same as from the line.
 */
export const TodayVisitCard = observer(function TodayVisitCard({
	visit,
	onRun,
}: {
	visit: AdminGuest;
	onRun: (command: VisitCommand) => void;
}) {
	const t = adminTranslations.en.guestProfile;
	const { admin } = useRootStore();

	return (
		<Card aria-label={t.todayTitle}>
			<h3>{t.todayTitle}</h3>
			<TicketSummary guest={visit} statusLabel={adminVisitStatusLabels('en')[visit.status]} />
			<div className="actions">
				<QueueGuestActions guest={visit} disabled={admin.isBusy} onRun={onRun} />
			</div>
		</Card>
	);
});
