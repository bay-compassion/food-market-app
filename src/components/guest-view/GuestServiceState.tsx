import { observer } from 'mobx-react-lite';

import { useTranslation } from '../../stores/react/use-translation';
import { GuestScheduleDetails } from './GuestScheduleDetails';
import { GuestStateMessage } from './GuestStateMessage';

export type GuestServiceStateProps = {
	/** `false` while service is underway (`service_started`); `true` once the session has `ended`. */
	hasEnded: boolean;
};

/**
 * Service is underway, or over. Only the ended state offers the schedule: while the market is
 * running there is nothing to come back for.
 */
export const GuestServiceState = observer(function GuestServiceState({
	hasEnded,
}: GuestServiceStateProps) {
	const t = useTranslation();
	const copy = hasEnded
		? {
				heading: t.guestView.serviceState.endedHeading,
				description: t.guestView.serviceState.endedDescription,
			}
		: {
				heading: t.guestView.serviceState.inProgressHeading,
				description: t.guestView.serviceState.inProgressDescription,
			};

	return (
		<GuestStateMessage
			heading={copy.heading}
			description={copy.description}
			details={hasEnded ? <GuestScheduleDetails /> : undefined}
		/>
	);
});
