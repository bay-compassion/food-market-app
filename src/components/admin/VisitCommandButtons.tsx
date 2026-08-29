import styled from '@emotion/styled';

import { adminTranslations } from '../../adminLocales';
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
	const t = adminTranslations.en;
	const commands = visitCommandsFrom(status);
	const labels: Record<VisitCommand, string> = {
		select: t.waiting,
		skip: t.notPlaced,
		call: t.callGuest,
		serve: t.markServed,
		mark_no_show: t.markNoShow,
		return_to_queue: t.returnToQueue,
		cancel: t.cancelled,
	};

	if (!commands.length) {
		return null;
	}

	return (
		<Commands className="visit-commands">
			{commands.map((command) => (
				<button
					key={command}
					type="button"
					className={command === 'call' || command === 'serve' ? 'primary' : undefined}
					disabled={disabled}
					onClick={() => onRun(command)}
				>
					{labels[command]}
				</button>
			))}
		</Commands>
	);
}
