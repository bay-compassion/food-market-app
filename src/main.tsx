import { Auth0Provider } from '@auth0/auth0-react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

import { auth0Settings } from './auth';
import { AppThemeProvider } from './components/AppThemeProvider';
import { router } from './router';
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
				>
					<RootStoreProvider store={rootStore}>
						<RouterProvider router={router} />
					</RootStoreProvider>
				</Auth0Provider>
			</AppThemeProvider>
		</StrictMode>
	);

	rootStore.start();
	createRoot(document.getElementById('app')!).render(tree);

	if (import.meta.hot) {
		import.meta.hot.dispose(() => rootStore[Symbol.dispose]());
	}
}

void bootstrap();
