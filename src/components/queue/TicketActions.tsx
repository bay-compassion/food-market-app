import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import type { QueueGuest } from '../../services/admin-api';
import { visitCommandsFrom } from '../../services/visitStateMachine';
import { primaryVisitCommands, visitCommandLabels } from '../admin/VisitCommandButtons';
import { useQueueDesk } from './queue-desk-context';

const Actions = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 8px;

	button,
	a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 16px;
		border: 0;
		border-radius: var(--radius-pill);
		color: var(--color-text);
		background: var(--color-surface-soft);
		font-size: 15px;
		font-weight: 700;
		text-decoration: none;
	}

	.primary {
		color: var(--color-on-brand);
		background: var(--color-success);
	}

	button:disabled {
		opacity: 0.6;
	}
`;

/**
 * What a volunteer can do with the open ticket. The state machine decides which commands exist;
 * the likely next one is filled. Sending one closes the ticket — the volunteer's next tap is the
 * next guest, not this one again.
 */
export const TicketActions = observer(function TicketActions({ guest }: { guest: QueueGuest }) {
	const t = adminTranslations.en;
	const desk = useQueueDesk();
	const labels = visitCommandLabels();
	const commands = visitCommandsFrom(guest.status).sort(
		(first, second) =>
			Number(primaryVisitCommands.includes(second)) - Number(primaryVisitCommands.includes(first)),
	);

	return (
		<Actions className="ticket-actions">
			{commands.map((command) => (
				<button
					key={command}
					type="button"
					className={primaryVisitCommands.includes(command) ? 'primary' : undefined}
					disabled={desk.isBusy}
					onClick={() => {
						desk.dismiss();
						void desk.run(guest, command);
					}}
				>
					{labels[command]}
				</button>
			))}
			<a href={`tel:${guest.phone.replace(/[^\d+]/g, '')}`}>{t.phoneGuest}</a>
		</Actions>
	);
});
