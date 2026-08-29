import { observer } from 'mobx-react-lite';

import { useTranslation } from '../../stores/react/use-translation';
import { Alert } from '../ui/alerts/Alert';

/** The standing schedule, as a notice above the card. */
export const ScheduleInformation = observer(function ScheduleInformation() {
	const t = useTranslation();

	return (
		<Alert
			heading={t.guestView.scheduleInformation.heading}
			body={t.guestView.scheduleInformation.body}
		/>
	);
});
