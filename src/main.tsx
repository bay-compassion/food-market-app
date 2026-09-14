import { Auth0Provider } from '@auth0/auth0-react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

import { auth0Settings, returnToPath } from './auth';
import { AppThemeProvider } from './components/AppThemeProvider';
import { router } from './router';
import { reactErrorHandler } from './sentry';
import { RootStoreProvider } from './stores/react/store-context';
import { RootStore } from './stores/root.store';

// Order matters: tokens and resets first, then the app chrome, then the per-area stylesheets.
import './styles/base.css';
import './styles/app-shell.css';
import './styles/admin.css';

async function bootstrap() {
	const previewName = window.sessionStorage.getItem('bay-compassion.demo-preview') ?? undefined;
	const browserStorage = previewName
		? new (await import('./stores/demo-preview-session')).DemoPreviewSession()
		: undefined;
	const rootStore = new RootStore({ browserStorage, previewName });

	/**
	 * `Auth0Provider` is mounted even with no Auth0 configured, so `useAuth0()` is safe to call
	 * unconditionally: the SDK supplies a context whose `isAuthenticated` is simply always false, and
	 * `isAuth0Configured` is what the screens branch on.
	 */
	const tree = (
		<StrictMode>
			<AppThemeProvider>
				<Auth0Provider
					domain={auth0Settings?.domain ?? ''}
					clientId={auth0Settings?.clientId ?? ''}
					authorizationParams={auth0Settings?.authorizationParams}
					// The SDK's default callback rewrites the URL with `history.replaceState`, which the
					// router never hears about, so the address bar and the screen would disagree. Routing
					// the return through the router itself is what actually puts a worker on the screen
					// they signed in for.
					onRedirectCallback={(appState) =>
						void router.navigate(returnToPath(appState), { replace: true })
					}
				>
					<RootStoreProvider store={rootStore}>
						<RouterProvider router={router} />
					</RootStoreProvider>
				</Auth0Provider>
			</AppThemeProvider>
		</StrictMode>
	);

	rootStore.start();
	// React 19 swallows render errors once a boundary handles them; these hand both the caught and
	// the uncaught ones to Sentry without the app owning a boundary of its own.
	createRoot(document.getElementById('app')!, {
		onCaughtError: reactErrorHandler(),
		onUncaughtError: reactErrorHandler(),
	}).render(tree);

	if (import.meta.hot) {
		import.meta.hot.dispose(() => rootStore[Symbol.dispose]());
	}
}

void bootstrap();
