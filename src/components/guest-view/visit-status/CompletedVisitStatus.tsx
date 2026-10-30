import { observer } from 'mobx-react-lite';
import type { ComponentType } from 'react';

import { useTranslation } from '../../../stores/react/use-translation';
import { CheckIcon } from '../../ui/icons/CheckIcon';
import { CloseIcon } from '../../ui/icons/CloseIcon';
import { PriorityHighIcon } from '../../ui/icons/PriorityHighIcon';
import { RemoveIcon } from '../../ui/icons/RemoveIcon';
import {
	GuestStatusPanel,
	type GuestStatusTone,
	StatusBody,
	StatusHeadline,
} from '../status-card/GuestStatusPanel';
import { NextRegistrationDetails } from '../status-card/NextRegistrationDetails';
import { VisitTicketStamp } from './VisitTicketStamp';

/** The visit statuses that have reached an outcome, and so have no queue details left. */
export type CompletedVisitStatusKey = 'served' | 'not_placed' | 'no_show' | 'cancelled';

/**
 * The mark each outcome wears. `no_show` is the only one a guest can still act on — a worker can
 * return them to the queue — so it is the only one that raises its voice.
 */
const outcomeMarks: Record<
	CompletedVisitStatusKey,
	{ Icon: ComponentType; tone: GuestStatusTone }
> = {
	served: { Icon: CheckIcon, tone: 'action' },
	not_placed: { Icon: RemoveIcon, tone: 'muted' },
	no_show: { Icon: PriorityHighIcon, tone: 'warning' },
	cancelled: { Icon: CloseIcon, tone: 'muted' },
};

/**
 * A visit that has reached an outcome. A guest who missed their call heads back to the check-in
 * desk, so they keep the ticket stamp for the worker there; every other outcome closes with when
 * registration next opens.
 */
export const CompletedVisitStatus = observer(function CompletedVisitStatus({
	status,
}: {
	status: CompletedVisitStatusKey;
}) {
	const copy = useTranslation().guestView.visitStatus;
	const { Icon, tone } = outcomeMarks[status];

	return (
		<GuestStatusPanel tone={tone} icon={<Icon />} heading={copy.labels[status]}>
			<StatusHeadline>{copy[status].header}</StatusHeadline>
			<StatusBody>{copy[status].details}</StatusBody>
			{status === 'no_show' ? <VisitTicketStamp /> : <NextRegistrationDetails variant="inset" />}
		</GuestStatusPanel>
	);
});
