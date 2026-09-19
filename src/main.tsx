import { Auth0Provider } from '@auth0/auth0-react';
import {
	createClient,
	createLDReactProviderWithClient,
	type LDContext,
} from '@launchdarkly/react-sdk';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

import { auth0Settings, returnToPath } from './auth';
import { AppThemeProvider } from './components/AppThemeProvider';
import { launchDarklySettings } from './launchdarkly-settings';
import { router } from './router';
import { enableReplayWhenFlagged, reactErrorHandler } from './sentry';
import { isUserInfoEnabled, SentryUserReporter } from './sentry-user';
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
	const sentryUser = isUserInfoEnabled ? new SentryUserReporter(rootStore.guest) : null;

	/**
	 * Guests are never asked to identify themselves to a third party: `GuestStore` keeps identity
	 * local to the browser (see its doc comment), and `SentryUserReporter` goes out of its way to
	 * send a hash rather than the raw device token. This context follows the same rule by sending
	 * LaunchDarkly nothing at all — `anonymous: true` with no `key` has the SDK generate a random
	 * one and persist it in local storage, which is enough to bucket a returning guest consistently
	 * without LaunchDarkly ever holding an identifier that means anything outside itself.
	 */
	const context: LDContext = {
		kind: 'user',
		key: '',
		anonymous: true,
	};

	const ldSettings = launchDarklySettings(import.meta.env);
	/**
	 * Unlike `Auth0Provider` below, `LDProvider` is mounted only when a project is actually
	 * configured. Building a client eagerly is unavoidable — even with `deferInitialization`, its
	 * constructor alone fires a goals request and a diagnostic event — so there is no way to hand
	 * out a working client that stays off the network, the way `sentry.ts` does for a missing DSN.
	 * Any future component that reads a flag therefore needs a provider in its tree, exactly as
	 * `useRootStore()` needs a `RootStoreProvider`: a component that reads flags without one throws
	 * loudly instead of quietly serving stale or wrong data, and a story or test that exercises it
	 * nests its own `LDProvider`, the same way a story that seeds its own store nests its own
	 * `ConfirmationDrawer`.
	 *
	 * `createClient` (rather than the `createLDReactProvider` convenience) is what hands back a
	 * client `enableReplayWhenFlagged` can subscribe to directly; `createLDReactProviderWithClient`
	 * wraps that same instance for the hooks, so `.start()` is this function's job instead of the
	 * provider's.
	 */
	const ldClient = ldSettings ? createClient(ldSettings.clientSideId, context) : null;

	if (ldClient) {
		void ldClient.start();
		enableReplayWhenFlagged(ldClient);
	}

	const LDProvider = ldClient ? createLDReactProviderWithClient(ldClient) : null;

	const app = (
		<AppThemeProvider>
			{/**
			 * `Auth0Provider` is mounted even with no Auth0 configured, so `useAuth0()` is safe to call
			 * unconditionally: the SDK supplies a context whose `isAuthenticated` is simply always false,
			 * and `isAuth0Configured` is what the screens branch on.
			 */}
			<Auth0Provider
				domain={auth0Settings?.domain ?? ''}
				clientId={auth0Settings?.clientId ?? ''}
				authorizationParams={auth0Settings?.authorizationParams}
				// The SDK's default callback rewrites the URL with `history.replaceState`, which the
				// router never hears about, so the address bar and the screen would disagree. Routing
				// the return through the router itself is what actually puts a worker on the screen
				// they signed in for.
				onRedirectCallback={(appState) =>
					void router.navigate(returnToPath(appState), {
						replace: true,
					})
				}
			>
				<RootStoreProvider store={rootStore}>
					<RouterProvider router={router} />
				</RootStoreProvider>
			</Auth0Provider>
		</AppThemeProvider>
	);

	const tree = <StrictMode>{LDProvider ? <LDProvider>{app}</LDProvider> : app}</StrictMode>;

	rootStore.start();
	// React 19 swallows render errors once a boundary handles them; these hand both the caught and
	// the uncaught ones to Sentry without the app owning a boundary of its own.
	createRoot(document.getElementById('app')!, {
		onCaughtError: reactErrorHandler(),
		onUncaughtError: reactErrorHandler(),
	}).render(tree);

	if (import.meta.hot) {
		import.meta.hot.dispose(() => {
			sentryUser?.[Symbol.dispose]();
			rootStore[Symbol.dispose]();
		});
	}
}

void bootstrap();
