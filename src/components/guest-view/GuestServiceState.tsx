import { Card, CardContent } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { useRootStore } from '@/stores/react/store-context.tsx';

import { useTranslation } from '../../stores/react/use-translation';
import { GuestScheduleDetails } from './GuestScheduleDetails';
import { GuestStateMessage } from './GuestStateMessage';

export type GuestServiceStateProps = {
	/** `false` while service is underway (`service_started`); `true` once the session has `ended`. */
	hasEnded?: boolean;
};

/**
 * Service is underway, or over. Only the ended state offers the schedule: while the market is
 * running there is nothing to come back for.
 */
export const GuestServiceState = observer(function GuestServiceState({
	hasEnded = false,
}: GuestServiceStateProps) {
	const t = useTranslation();
	const { visit } = useRootStore();

	let header = '';
	let description = '';

	switch (visit.status) {
		case 'registered':
			header = 'Registered';
			description = 'You are in the lottery.';
			break;
		case 'waiting':
			header = 'Waiting';
			description = 'You are waiting for the service.';
			break;
		case 'called':
			header = 'Called';
			description = 'You have been called for the service.';
			break;
		case 'served':
			header = 'Served';
			description = 'You have been served.';
			break;
		case 'not_placed':
			header = 'Not Placed';
			description = 'You were not placed for the service.';
			break;
		case 'no_show':
			header = 'No Show';
			description = 'You did not show up for the service.';
			break;
		case 'cancelled':
			header = 'Cancelled';
			description = 'Your service has been cancelled.';
			break;
		default:
			return null;
	}

	return (
		<Card>
			<CardContent>
				<GuestStateMessage
					heading={header}
					description={description}
					details={hasEnded ? <GuestScheduleDetails /> : undefined}
				/>
			</CardContent>
		</Card>
	);
});
