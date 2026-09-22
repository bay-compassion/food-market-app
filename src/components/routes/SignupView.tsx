import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import { GuestSignupForm } from '../guest-view/forms/GuestSignupForm';
import { BackButton } from '../ui/BackButton';
import { Card } from '../ui/layout/Card';

const SignupBackButton = styled(BackButton)`
	margin-bottom: 20px;
`;

/** `/signup`: saving a guest identity for later visits, without joining a queue. */
export const SignupView = observer(function SignupView() {
	const t = useTranslation();
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
			<SignupBackButton label={t.backToGuest} onClick={() => void navigate('/')} />
			<Card aria-live="polite">
				<GuestSignupForm />
			</Card>
		</section>
	);
});
