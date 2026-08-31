import { observer } from 'mobx-react-lite';

import { useTranslation } from '../../stores/react/use-translation';
import { GuestStateMessage } from './GuestStateMessage';

/** The market is serving guests, but this device has no current-market visit to present. */
export const GuestServiceState = observer(function GuestServiceState() {
	const t = useTranslation();
	const copy = t.guestView.serviceState;

	return (
		<GuestStateMessage heading={copy.inProgressHeading} description={copy.inProgressDescription} />
	);
});
