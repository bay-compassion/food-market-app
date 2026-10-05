import { useAuth0 } from '@auth0/auth0-react';
import { observer } from 'mobx-react-lite';

import { isAuth0Configured } from '../../auth';
import { useTranslation } from '../../stores/react/use-translation';
import { RequireAuth } from '../RequireAuth';
import { QueueDesk, QueueDeskFrame, QueueDeskMessage } from './QueueDesk';

/**
 * The `/queue` entry point: the screen a volunteer runs the line from on their own phone.
 *
 * Its own lazily loaded route, outside the app shell like `/kiosk`, so neither the guest app's bar
 * nor the admin dashboard comes with it. Signing in works as it does for `/admin`; the store then
 * checks for `run:queue`, which the `worker` role holds (see `docs/roles.md`).
 */
export function QueueRoute() {
	return (
		<RequireAuth>
			<QueueAuthGate />
		</RequireAuth>
	);
}

const QueueAuthGate = observer(function QueueAuthGate() {
	const t = useTranslation();
	const auth = useAuth0();
	let message: string | null = null;

	if (!isAuth0Configured) {
		message = t.authConfigurationRequired;
	} else if (auth.isLoading) {
		message = t.authLoading;
	} else if (!auth.isAuthenticated) {
		message = t.authError;
	}

	return message ? (
		<QueueDeskFrame>
			<QueueDeskMessage text={message} />
		</QueueDeskFrame>
	) : (
		<QueueDesk getAccessToken={auth.getAccessTokenSilently} />
	);
});
