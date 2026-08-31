import { observer } from 'mobx-react-lite';

import { useTranslation } from '../../stores/react/use-translation';
import { GuestStateMessage } from './GuestStateMessage';

/** Registration for today has closed, but the session has not started serving yet. */
export const GuestRegistrationClosedState = observer(function GuestRegistrationClosedState() {
	const t = useTranslation();

	return (
		<GuestStateMessage
			heading={t.guestView.registrationClosedState.heading}
			description={t.guestView.registrationClosedState.description}
		/>
	);
});
