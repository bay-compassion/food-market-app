import type { VisitStatusTranslations } from '@/locales.ts';

import type { QueueNumber } from '../../../models/queue-number';
import { ArrowForwardIcon } from '../../ui/icons/ArrowForwardIcon';
import { TicketIcon } from '../../ui/icons/TicketIcon';
import { GuestStatusPanel, StatusBody, StatusHeadline } from '../status-card/GuestStatusPanel';
import { QueueNumberBoard } from './QueueNumberBoard';
import { StandingCard } from './StandingCard';
import { VisitTicketStamp } from './VisitTicketStamp';

export type StandbyVisitStatusProps = {
	copy: VisitStatusTranslations;
	/** On the list (`waiting`), or admitted and on their way to the desk (`called`). */
	status: 'waiting' | 'called';
	/** The guest's S number, or `null` for a visit that has none. */
	queueNumber: QueueNumber | null;
};

/**
 * A standby guest's card. On the list, it says so plainly, with no place in it and no "now calling"
 * row: standby promises nothing, and a worker admits guests by name and S number at the desk. Once
 * admitted, it turns to the "go" tone, like the line's called card, minus the warming board — the
 * desk is a few steps away and the call is quick. The S number sits on the same board either way,
 * since it is what the worker reads out with the guest's name.
 */
export function StandbyVisitStatus({ copy, status, queueNumber }: StandbyVisitStatusProps) {
	const called = status === 'called';
	const board = queueNumber ? (
		<StandingCard className="standby-standing">
			<QueueNumberBoard
				label={copy.yourNumberLabel}
				number={queueNumber}
				tone={called ? 'action' : undefined}
			/>
		</StandingCard>
	) : null;

	return called ? (
		<GuestStatusPanel
			tone="action"
			icon={<ArrowForwardIcon />}
			mirrorIcon
			heading={copy.called.eyebrow}
		>
			<StatusHeadline>{copy.standby.calledHeader}</StatusHeadline>
			{board}
			<VisitTicketStamp />
			<StatusBody>{copy.standby.calledDetails}</StatusBody>
		</GuestStatusPanel>
	) : (
		<GuestStatusPanel tone="brand" icon={<TicketIcon />} heading={copy.standby.waitingHeader}>
			{board}
			<VisitTicketStamp />
			<StatusBody>{copy.standby.waitingDetails}</StatusBody>
		</GuestStatusPanel>
	);
}
