import Button from '@mui/material/Button';
import { observer } from 'mobx-react-lite';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { EventIcon } from '../../ui/icons/EventIcon';

/**
 * Saves the next registration window to the guest's calendar. Renders nothing when the schedule
 * names no date, since "every Saturday" has no particular day to put in a calendar.
 */
export const AddToCalendarButton = observer(function AddToCalendarButton() {
	const { session } = useRootStore();
	const copy = useTranslation().guestView.notOpenState;
	const invite = session.nextRegistration.invite(copy.calendarEventTitle, window.location.origin);

	if (!invite) {
		return null;
	}

	return (
		<Button
			component="a"
			href={invite.dataUri}
			download={invite.fileName}
			variant="outlined"
			startIcon={<EventIcon />}
		>
			{copy.addToCalendar}
		</Button>
	);
});
