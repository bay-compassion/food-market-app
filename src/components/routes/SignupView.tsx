import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import type { RegistrationSubmitResult } from '../../stores/registration.store';
import { GuestRegistrationForm } from '../guest-view/GuestRegistrationForm';
import { GuestStateMessage } from '../guest-view/GuestStateMessage';
import { Card } from '../ui/layout/Card';

/** `/signup`: creating a guest identity ahead of a session, without joining a queue. */
export const SignupView = observer(function SignupView() {
	const t = useTranslation();
	const { guest } = useRootStore();
	const navigate = useNavigate();
	const [isSignedUp, setIsSignedUp] = useState(false);

	// Signing up (identity only) only makes sense before a device has one — an already-identified
	// guest has nothing left to ask here, so send them to the page that reflects their real state
	// (queue form, visit status, or the session's current phase) instead of duplicating that logic.
	useEffect(() => {
		if (guest.isIdentified) {
			void navigate('/', { replace: true });
		}
	}, [guest.isIdentified, navigate]);

	function handleSubmitted(result: RegistrationSubmitResult) {
		if (result.kind === 'signed-up') {
			setIsSignedUp(true);
		}
	}

	return (
		<Card aria-live="polite">
			{isSignedUp ? (
				<GuestStateMessage heading={t.earlySuccessTitle} description={t.earlySuccessDescription} />
			) : (
				<GuestRegistrationForm context="early" now={Date.now()} onSubmitted={handleSubmitted} />
			)}
		</Card>
	);
});
