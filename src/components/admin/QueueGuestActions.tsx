import styled from '@emotion/styled';
import { MenuItem } from '@mui/material';

import { adminTranslations } from '../../adminLocales';
import { visitCommandsFrom, type VisitCommand } from '../../services/visitStateMachine';
import { OverflowMenu } from './OverflowMenu';
import type { QueueGuest } from './types';
import { primaryVisitCommands, visitCommandLabels } from './VisitCommandButtons';

export type QueueGuestActionsProps = {
	guest: QueueGuest;
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
 */
export function QueueGuestActions({ guest, disabled, menuOnly, onRun }: QueueGuestActionsProps) {
	const t = adminTranslations.en;
	const commands = visitCommandsFrom(guest.status);
	const primary = menuOnly ? undefined : commands.find((c) => primaryVisitCommands.includes(c));
	const secondary = commands.filter((command) => command !== primary);
	const labels = visitCommandLabels();
	const shortLabels: Partial<Record<VisitCommand, string>> = {
		call: t.callShort,
		serve: t.serveShort,
	};
	const guestName = `${guest.firstName} ${guest.lastName}`;

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
					</>
				)}
			</OverflowMenu>
		</Actions>
	);
}
