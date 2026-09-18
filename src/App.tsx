import { useAuth0 } from '@auth0/auth0-react';
import { observer } from 'mobx-react-lite';
import { lazy, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router';

import { AppFooter } from './components/AppFooter';
import { AppBar } from './components/ui/app-bar/AppBar';
import { ConfirmationDrawer } from './components/ui/ConfirmationDrawer';
import { NotificationToasts } from './components/ui/NotificationToasts';
import { useRootStore } from './stores/react/store-context';
import { useTranslation } from './stores/react/use-translation';

const DemoPreviewBanner = lazy(() => import('./components/admin/DemoPreviewBanner'));

/**
 * The shell every route renders inside: the bar, an auth banner when one applies, and the footer.
 *
 * It also mounts the confirmation sheet and the toasts, which any screen inside it can raise
 * through the store without owning a piece of dialog or snackbar state of its own.
 */
export const App = observer(function App() {
	const t = useTranslation();
	const { translations, previewName } = useRootStore();
	const { error } = useAuth0();
	const isQrCode = useLocation().pathname === '/qr-code';

	return (
		<main className={`app-shell${isQrCode ? ' app-shell--print-qr' : ''}`} dir={translations.dir}>
			{previewName ? (
				<Suspense>
					<DemoPreviewBanner />
				</Suspense>
			) : null}
			<AppBar />
			{error ? (
				<p className="auth-banner" role="alert">
					{t.authError}
				</p>
			) : null}
			<Outlet />
			<AppFooter />
			<ConfirmationDrawer />
			<NotificationToasts />
		</main>
	);
});
