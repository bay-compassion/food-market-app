import { observer } from 'mobx-react-lite';

import { useTranslation } from '../../stores/react/use-translation';
import { GuestGuideButton } from '../GuestGuideButton';
import { StorefrontIcon } from '../ui/icons/StorefrontIcon';
import { AddToCalendarButton } from './status-card/AddToCalendarButton';
import { GuestStatusPanel, StatusActions } from './status-card/GuestStatusPanel';
import { NextRegistrationDetails } from './status-card/NextRegistrationDetails';

/** The market is closed, when registration opens again, and the calendar and guide buttons. */
export const GuestNextOpening = observer(function GuestNextOpening() {
	const copy = useTranslation().guestView.notOpenState;

	return (
		<GuestStatusPanel tone="brand" icon={<StorefrontIcon />} heading={copy.heading}>
			<NextRegistrationDetails variant="lead" />
			<StatusActions>
				<AddToCalendarButton />
				<GuestGuideButton compact />
			</StatusActions>
		</GuestStatusPanel>
	);
});
