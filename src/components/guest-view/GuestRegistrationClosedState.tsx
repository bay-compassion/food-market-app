import { observer } from 'mobx-react-lite';

import { useTranslation } from '../../stores/react/use-translation';
import { GuestGuideButton } from '../GuestGuideButton';
import { ScheduleIcon } from '../ui/icons/ScheduleIcon';
import { GuestNoVisitState } from './GuestNoVisitState';
import {
	GuestStatusPanel,
	StatusActions,
	StatusBody,
	StatusHeadline,
} from './status-card/GuestStatusPanel';
import { NextRegistrationDetails } from './status-card/NextRegistrationDetails';

/**
 * Today's registration has closed and this guest has no visit: they missed the window. The same
 * card whether the draw is still to run or shopping has begun, since either way all that is left
 * for them is next time.
 */
export const GuestRegistrationClosedState = observer(function GuestRegistrationClosedState() {
	const copy = useTranslation().guestView.registrationClosedState;

	return (
		<GuestNoVisitState>
			<GuestStatusPanel tone="warning" icon={<ScheduleIcon />} heading={copy.heading}>
				<StatusHeadline>{copy.headline}</StatusHeadline>
				<StatusBody>{copy.description}</StatusBody>
				<NextRegistrationDetails variant="inset" />
				<StatusActions>
					<GuestGuideButton compact />
				</StatusActions>
			</GuestStatusPanel>
		</GuestNoVisitState>
	);
});
