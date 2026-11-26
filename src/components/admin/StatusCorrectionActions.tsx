import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { VisitStatusCorrection } from '../../models/visit-status-correction';
import type { QueueGuest } from '../../services/admin-api';
import type { VisitStatus } from '../../services/visitStateMachine';
import { adminVisitStatusLabels } from '../../services/visitStatusLabels';
import { useRootStore } from '../../stores/react/store-context';
import { TicketActionBar } from '../queue/TicketActionBar';

const Section = styled.section`
	display: grid;
	gap: 10px;

	h2 {
		margin: 0;
		font-family: var(--font-heading);
		font-size: 16px;
		font-weight: 700;
	}

	p {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 14px;
	}
`;

/**
 * An ended session's ticket's one action: setting the status the visit should have had, as a
 * button per status a correction allows. Each asks first, naming both statuses, since a past
 * session's numbers change with it.
 */
export const StatusCorrectionActions = observer(function StatusCorrectionActions({
	guest,
}: {
	guest: QueueGuest;
}) {
	const t = adminTranslations.en;
	const { admin, confirmation } = useRootStore();
	const participants = admin.sessionParticipants;
	const labels = adminVisitStatusLabels('en');
	const name = `${guest.firstName} ${guest.lastName}`.trim();
	const fill = (template: string, to: VisitStatus) =>
		template
			.replace('{name}', name)
			.replace('{from}', labels[guest.status])
			.replaceAll('{to}', labels[to]);

	async function correct(status: VisitStatus) {
		const confirmed = await confirmation.ask({
			question: fill(t.participants.confirmQuestion, status),
			details: [fill(t.participants.confirmDetail, status)],
			confirmLabel: t.participants.confirm,
			dismissLabel: t.cancel,
		});

		if (confirmed) {
			await participants.correct(guest, status);
		}
	}

	return (
		<Section aria-labelledby={`correct-${guest.id}`}>
			<h2 id={`correct-${guest.id}`}>{t.participants.correctTitle}</h2>
			<p>{t.participants.correctHelp}</p>
			<TicketActionBar>
				{new VisitStatusCorrection(guest.status).targets.map((status) => (
					<button
						key={status}
						type="button"
						disabled={participants.isCorrecting}
						onClick={() => void correct(status)}
					>
						{t.participants.changeTo.replace('{status}', labels[status])}
					</button>
				))}
			</TicketActionBar>
		</Section>
	);
});
