import { observer } from 'mobx-react-lite';

import { useTranslation } from '../../stores/react/use-translation';
import { useNextRegistrationText } from '../hooks/use-next-registration-text';
import { GuestStateMessage } from './GuestStateMessage';

/** Registration for today has closed, but the session has not started serving yet. */
export const GuestRegistrationClosedState = observer(function GuestRegistrationClosedState() {
	const t = useTranslation();
	const nextRegistration = useNextRegistrationText();

	return (
		<GuestStateMessage
			heading={t.guestView.registrationClosedState.heading}
			description={nextRegistration(t.guestView.registrationClosedState.description)}
		/>
	);
});
