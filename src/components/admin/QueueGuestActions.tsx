import styled from '@emotion/styled';
import { MenuItem } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { visitCommandsFrom, type VisitCommand } from '../../services/visitStateMachine';
import { useRootStore } from '../../stores/react/store-context';
import { OverflowMenu } from './OverflowMenu';
import type { DatabaseGuest } from './types';
import { primaryVisitCommands, visitCommandLabels } from './VisitCommandButtons';

export type QueueGuestActionsProps = {
	/** A visit, or — in the guest database — a guest with none, who has no commands to run. */
	guest: DatabaseGuest;
	disabled?: boolean;
	/**
	 * Folds every command into the menu. For a screen that is looked things up on rather than run
	 * from, where no one command is the likely next step and a row of filled buttons would only
	 * invite a mis-tap.
	 */
	menuOnly?: boolean;
	onRun: (command: VisitCommand) => void;
};

const Actions = styled.div`
	display: flex;
	gap: 2px;
	align-items: center;

	.primary-command {
		min-height: 40px;
		padding: 0 16px;
		border: 0;
		border-radius: var(--radius-pill);
		color: var(--color-on-brand);
		background: var(--color-brand);
		font-size: 14px;
		font-weight: 700;
		white-space: nowrap;
	}

	.primary-command:disabled {
		cursor: wait;
		opacity: 0.65;
	}
`;

/**
 * What a worker can do with one guest: the likely next step as a single tap, and everything
 * else — the rarer transitions and a tap-to-dial phone number — folded into a menu so a row stays
 * two lines tall. The state machine still decides which commands exist.
 *
 * A manager (`manage:guest-access`) also gets the QR code that puts this guest on a phone — any
 * guest, at any time, including one already on another phone. It asks first: the code hands over
 * the guest's record and place in line, so the manager has to know who they are handing it to.
 */
export const QueueGuestActions = observer(function QueueGuestActions({
	guest,
	disabled,
	menuOnly,
	onRun,
}: QueueGuestActionsProps) {
	const t = adminTranslations.en;
	const { admin, confirmation } = useRootStore();
	const commands = guest.status === null ? [] : visitCommandsFrom(guest.status);
	const primary = menuOnly ? undefined : commands.find((c) => primaryVisitCommands.includes(c));
	const secondary = commands.filter((command) => command !== primary);
	const labels = visitCommandLabels();
	const shortLabels: Partial<Record<VisitCommand, string>> = {
		call: t.callShort,
		serve: t.serveShort,
	};
	const guestName = `${guest.firstName} ${guest.lastName}`;

	async function showPhoneCode() {
		const confirmed = await confirmation.ask({
			question: t.guestClaimConfirm.replace('{name}', guestName),
			details: [
				t.guestClaimConfirmIdentity.replace('{name}', guestName).replace('{phone}', guest.phone),
				t.guestClaimConfirmReplacesPhone,
			],
			confirmLabel: t.guestClaimShow,
			dismissLabel: t.cancel,
		});

		if (confirmed) {
			await admin.showGuestClaim({ guestId: guest.guestId, name: guestName });
		}
	}

	return (
		<Actions className="visit-commands">
			{primary ? (
				<button
					type="button"
					className="primary-command"
					disabled={disabled}
					aria-label={`${labels[primary]}: ${guestName}`}
					onClick={() => onRun(primary)}
				>
					{shortLabels[primary] ?? labels[primary]}
				</button>
			) : null}
			<OverflowMenu label={`${t.moreActions}: ${guestName}`} disabled={disabled}>
				{(closeMenu) => (
					<>
						{secondary.map((command) => (
							<MenuItem
								key={command}
								onClick={() => {
									closeMenu();
									onRun(command);
								}}
							>
								{labels[command]}
							</MenuItem>
						))}
						<MenuItem
							component="a"
							href={`tel:${guest.phone.replace(/[^\d+]/g, '')}`}
							onClick={closeMenu}
						>
							{t.phoneGuest} {guest.phone}
						</MenuItem>
						{admin.can('manage:guest-access') ? (
							<MenuItem
								onClick={() => {
									closeMenu();
									void showPhoneCode();
								}}
							>
								{t.guestClaimShow}
							</MenuItem>
						) : null}
					</>
				)}
			</OverflowMenu>
		</Actions>
	);
});
