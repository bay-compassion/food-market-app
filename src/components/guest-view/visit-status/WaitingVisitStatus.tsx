import type { VisitStatusTranslations } from '@/locales.ts';

import type { NowCalling } from '../../../models/now-calling';
import type { QueueNumber } from '../../../models/queue-number';
import { TicketIcon } from '../../ui/icons/TicketIcon';
import { GuestStatusPanel, StatusBody } from '../status-card/GuestStatusPanel';
import { QueueStanding } from './QueueStanding';
import { VisitTicketStamp } from './VisitTicketStamp';

export type WaitingVisitStatusProps = {
	copy: VisitStatusTranslations;
	queueNumber: QueueNumber | null;
	guestsAhead: number | null;
	nowCalling: NowCalling | null;
};

/**
 * Holding a number: the number first, then the ticket stamp right under it, so a screenshot of the
 * top of the screen carries both to the check-in desk.
 */
export function WaitingVisitStatus({
	copy,
	queueNumber,
	guestsAhead,
	nowCalling,
}: WaitingVisitStatusProps) {
	return (
		<GuestStatusPanel tone="brand" icon={<TicketIcon />} heading={copy.waiting.header}>
			{queueNumber ? (
				<QueueStanding
					copy={copy}
					queueNumber={queueNumber}
					guestsAhead={guestsAhead}
					nowCalling={nowCalling}
				/>
			) : null}
			<VisitTicketStamp />
			<StatusBody>{copy.waiting.details}</StatusBody>
		</GuestStatusPanel>
	);
}
