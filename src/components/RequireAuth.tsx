import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, type ReactNode } from 'react';

import { isAuth0Configured } from '../auth';

/**
 * Sends an unauthenticated visitor to Auth0, the way vue-router's `authGuard` did before routing
 * moved to React.
 *
 * It renders its children regardless — the screen behind it shows its own "signing in" and "not
 * signed in" states, and with no Auth0 configured at all there is nothing to redirect to.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
	const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

	useEffect(() => {
		if (isAuth0Configured && !isLoading && !isAuthenticated) {
			void loginWithRedirect();
		}
	}, [isAuthenticated, isLoading, loginWithRedirect]);

	return children;
}
