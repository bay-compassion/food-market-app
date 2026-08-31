import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { useRootStore } from '../../stores/react/store-context';
import { GuestSignupForm } from '../guest-view/forms/GuestSignupForm';
import { Card } from '../ui/layout/Card';

/** `/signup`: saving a guest identity for later visits, without joining a queue. */
export const SignupView = observer(function SignupView() {
	const { guest } = useRootStore();
	const navigate = useNavigate();
	const [shouldRedirect] = useState(() => guest.isIdentified);

	// Signing up (identity only) only makes sense before a device has one — an already-identified
	// guest has nothing left to ask here, so send them to the page that reflects their real state
	// (queue form, visit status, or the session's current phase) instead of duplicating that logic.
	useEffect(() => {
		if (shouldRedirect) {
			void navigate('/', { replace: true });
		}
	}, [navigate, shouldRedirect]);

	return (
		<section className="guest-layout">
			<Card aria-live="polite">
				<GuestSignupForm />
			</Card>
		</section>
	);
});
