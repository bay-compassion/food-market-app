import styled from '@emotion/styled';

import { adminTranslations } from '../../adminLocales';
import type { VisitTrack } from '../../services/visit-track';
import {
	visitCommandsFrom,
	type VisitCommand,
	type VisitStatus,
} from '../../services/visitStateMachine';

export type VisitCommandButtonsProps = {
	status: VisitStatus;
	disabled?: boolean;
	onRun: (command: VisitCommand) => void;
};

/** The command a worker is most likely to want from a given status, drawn as the filled button. */
export const primaryVisitCommands: VisitCommand[] = ['call', 'serve'];

/**
 * What each command is called on a button or in a menu, for a visit on `track`. A standby guest is
 * admitted rather than called, and a worker's `cancel` takes them off the list; for anyone else the
 * only `cancel` a worker is offered removes a premarket volunteer (see `VisitCommands`).
 */
export function visitCommandLabels(track: VisitTrack = 'lottery'): Record<VisitCommand, string> {
	const t = adminTranslations.en;
	const standby = track === 'postmarket';

	return {
		select: t.waiting,
		skip: t.notPlaced,
		call: standby ? t.admitFromStandby : t.callGuest,
		serve: t.markServed,
		mark_no_show: t.markNoShow,
		return_to_queue: t.returnToQueue,
		cancel: standby ? t.takeOffStandby : t.removeFromPremarket,
	};
}

const Commands = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 8px;

	button {
		min-height: 44px;
		padding: 0 14px;
		border: 1.5px solid var(--color-brand);
		border-radius: var(--radius-pill);
		color: var(--color-brand);
		background: var(--color-background);
		font-size: 14px;
		font-weight: 700;
	}

	button.primary {
		color: var(--color-on-brand);
		background: var(--color-brand);
	}

	button:disabled {
		cursor: wait;
		opacity: 0.65;
	}
`;

/** Whichever transitions a visit's current status allows — the state machine decides, not this. */
export function VisitCommandButtons({ status, disabled, onRun }: VisitCommandButtonsProps) {
	const commands = visitCommandsFrom(status);
	const labels = visitCommandLabels();

	if (!commands.length) {
		return null;
	}

	return (
		<Commands className="visit-commands">
			{commands.map((command) => (
				<button
					key={command}
					type="button"
					className={primaryVisitCommands.includes(command) ? 'primary' : undefined}
					disabled={disabled}
					onClick={() => onRun(command)}
				>
					{labels[command]}
				</button>
			))}
		</Commands>
	);
}
