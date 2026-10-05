import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import type { QueueGuest } from '../../services/admin-api';
import { visitCommandsFrom, type VisitCommand } from '../../services/visitStateMachine';
import { primaryVisitCommands, visitCommandLabels } from '../admin/VisitCommandButtons';
import { useQueueDesk } from './queue-desk-context';
import { ReturnToQueueButton } from './ReturnToQueueButton';

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
 * the likely next one is filled. For the guest called most recently, with someone still in line,
 * that is serving them and calling the next guest in one tap, which opens the next ticket in this
 * one's place; a late arrival called earlier is only marked served, so the line does not advance.
 * Any other command closes the ticket — the volunteer's next tap is the next guest, not this one.
 */
export const TicketActions = observer(function TicketActions({ guest }: { guest: QueueGuest }) {
	const t = adminTranslations.en;
	const desk = useQueueDesk();
	const labels = visitCommandLabels();
	const offersServeAndCallNext = desk.canServeAndCallNext(guest);
	// The combined step takes the filled style when it is offered; there is only ever one.
	const isPrimary = (command: VisitCommand) =>
		!offersServeAndCallNext && primaryVisitCommands.includes(command);
	const available = visitCommandsFrom(guest.status);
	// Returning to the queue asks where, so it gets a control of its own after the rest.
	const commands = available
		.filter((command) => command !== 'return_to_queue')
		.sort(
			(first, second) =>
				Number(primaryVisitCommands.includes(second)) -
				Number(primaryVisitCommands.includes(first)),
		);

	return (
		<Actions className="ticket-actions">
			{offersServeAndCallNext ? (
				<button
					type="button"
					className="primary"
					disabled={desk.isBusy}
					onClick={() => void desk.serveAndCallNext(guest)}
				>
					{t.queueDesk.serveAndCallNext}
				</button>
			) : null}
			{commands.map((command) => (
				<button
					key={command}
					type="button"
					className={isPrimary(command) ? 'primary' : undefined}
					disabled={desk.isBusy}
					onClick={() => {
						desk.dismiss();
						void desk.run(guest, command);
					}}
				>
					{labels[command]}
				</button>
			))}
			{available.includes('return_to_queue') ? (
				<ReturnToQueueButton
					disabled={desk.isBusy}
					onReturn={(placement) => {
						desk.dismiss();
						void desk.run(guest, 'return_to_queue', placement);
					}}
				/>
			) : null}
			<a href={`tel:${guest.phone.replace(/[^\d+]/g, '')}`}>{t.phoneGuest}</a>
		</Actions>
	);
});
