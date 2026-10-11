import type { VisitStatusTranslations } from '@/locales.ts';

import { GuestVisitStatusPanel } from './GuestVisitStatusPanel';
import { QueueStanding } from './QueueStanding';
import { VisitTicketStamp } from './VisitTicketStamp';

export type WaitingVisitStatusProps = {
	copy: VisitStatusTranslations;
	queuePosition: number | null;
	guestsAhead: number | null;
	nowCalling: number | null;
};

export function WaitingVisitStatus({
	copy,
	queuePosition,
	guestsAhead,
	nowCalling,
}: WaitingVisitStatusProps) {
	const queueDetails = queuePosition ? (
		<QueueStanding
			copy={copy}
			queuePosition={queuePosition}
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
