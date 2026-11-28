import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { VisitCommands } from '../../models/visit-commands';
import type { QueueGuest } from '../../services/admin-api';
import type { VisitCommand } from '../../services/visitStateMachine';
import { useConfirmVisitCommand } from '../admin/use-confirm-visit-command';
import { useShowGuestClaim } from '../admin/use-show-guest-claim';
import { primaryVisitCommands, visitCommandLabels } from '../admin/VisitCommandButtons';
import { useQueueDesk } from './queue-desk-context';
import { ReturnToQueueButton } from './ReturnToQueueButton';
import { TicketActionBar } from './TicketActionBar';

/**
 * What a volunteer can do with the open ticket. The state machine decides which commands exist;
 * the likely next one is filled. For the guest called most recently, with someone still in line,
 * that is serving them and calling the next guest in one tap, which opens the next ticket in this
 * one's place; a late arrival called earlier is only marked served, so the line does not advance.
 * Any other command closes the ticket — the volunteer's next tap is the next guest, not this one.
 * A manager also gets the code that puts this guest on a phone, which leaves the ticket open.
 */
export const TicketActions = observer(function TicketActions({ guest }: { guest: QueueGuest }) {
	const t = adminTranslations.en;
	const desk = useQueueDesk();
	const labels = visitCommandLabels(guest.track);
	const showGuestClaim = useShowGuestClaim();
	const offersServeAndCallNext = desk.canServeAndCallNext(guest);
	// The combined step takes the filled style when it is offered; there is only ever one.
	const isPrimary = (command: VisitCommand) =>
		!offersServeAndCallNext && primaryVisitCommands.includes(command);
	const confirmCommand = useConfirmVisitCommand();
	const available = new VisitCommands(guest).offered;
	// Returning to the queue asks where, so it gets a control of its own after the rest.
	const commands = available
		.filter((command) => command !== 'return_to_queue')
		.sort(
			(first, second) =>
				Number(primaryVisitCommands.includes(second)) -
				Number(primaryVisitCommands.includes(first)),
		);

	return (
		<TicketActionBar className="ticket-actions">
			{offersServeAndCallNext ? (
				<button
					type="button"
					className="primary"
					// It calls a guest too, so it waits for a call already on its way.
					disabled={desk.isBusy || desk.isCalling}
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
					onClick={async () => {
						if (!(await confirmCommand(guest, command))) {
							return;
						}

						desk.dismiss();
						void desk.run(guest, command);
					}}
				>
					{labels[command]}
				</button>
			))}
			{available.includes('return_to_queue') && guest.track === 'postmarket' ? (
				// A standby guest goes back to their place in S order; there is no front or back to pick.
				<button
					type="button"
					disabled={desk.isBusy}
					onClick={() => {
						desk.dismiss();
						void desk.run(guest, 'return_to_queue');
					}}
				>
					{t.backOnStandby}
				</button>
			) : available.includes('return_to_queue') ? (
				<ReturnToQueueButton
					disabled={desk.isBusy}
					onReturn={(placement) => {
						desk.dismiss();
						void desk.run(guest, 'return_to_queue', placement);
					}}
				/>
			) : null}
			<a href={`tel:${guest.phone.replace(/[^\d+]/g, '')}`}>{t.phoneGuest}</a>
			{showGuestClaim ? (
				<button type="button" disabled={desk.isBusy} onClick={() => void showGuestClaim(guest)}>
					{t.guestClaimShow}
				</button>
			) : null}
		</TicketActionBar>
	);
});
