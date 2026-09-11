import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router';

import { isAuth0Configured } from '../auth';

/**
 * Sends an unauthenticated visitor to Auth0, the way vue-router's `authGuard` did before routing
 * moved to React.
 *
 * It renders its children regardless — the screen behind it shows its own "signing in" and "not
 * signed in" states, and with no Auth0 configured at all there is nothing to redirect to.
 *
 * The screen being asked for is recorded in `appState`, because Auth0 returns to the app's root
 * rather than to it: `redirect_uri` is one fixed callback URL, so without this a worker who taps
 * "Staff Login" signs in successfully and lands back on the guest view. `onRedirectCallback` in
 * `main.tsx` reads it back.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
	const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
	const { pathname, search } = useLocation();

	useEffect(() => {
		if (isAuth0Configured && !isLoading && !isAuthenticated) {
			void loginWithRedirect({ appState: { returnTo: `${pathname}${search}` } });
		}
	}, [isAuthenticated, isLoading, loginWithRedirect, pathname, search]);

	return children;
}
