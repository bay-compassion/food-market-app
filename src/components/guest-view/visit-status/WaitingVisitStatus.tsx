import type { VisitStatusTranslations } from '@/locales.ts';

import type { NowCalling } from '../../../models/now-calling';
import type { QueueNumber } from '../../../models/queue-number';
import { GuestVisitStatusPanel } from './GuestVisitStatusPanel';
import { QueueStanding } from './QueueStanding';
import { VisitTicketStamp } from './VisitTicketStamp';

export type WaitingVisitStatusProps = {
	copy: VisitStatusTranslations;
	queueNumber: QueueNumber | null;
	guestsAhead: number | null;
	nowCalling: NowCalling | null;
};

export function WaitingVisitStatus({
	copy,
	queueNumber,
	guestsAhead,
	nowCalling,
}: WaitingVisitStatusProps) {
	const queueDetails = queueNumber ? (
		<QueueStanding
			copy={copy}
			queueNumber={queueNumber}
			guestsAhead={guestsAhead}
			nowCalling={nowCalling}
		/>
	) : null;

	return (
		<GuestVisitStatusPanel
			icon="✓"
			heading={copy.waiting.header}
			description={copy.waiting.details}
			details={
				<>
					<VisitTicketStamp />
					{queueDetails}
				</>
			}
		/>
	);
}
