import { createBrowserRouter } from 'react-router';

import { App } from './App';
import { GuestView } from './components/guest-view/GuestView';
import { QrCodeView } from './components/QrCodeView';
import { SignupView } from './components/routes/SignupView';

/**
 * Everything a guest does lives in the initial chunk; everything else is loaded on demand.
 *
 * This is not a micro-optimization. A guest registers on a phone, often on a slow connection,
 * inside a one-hour window — the admin dashboard, the reporting tables, and the printable QR
 * poster are all screens a worker opens on a desk, and none of them should be in the download
 * that stands between a guest and the queue.
 */
export const router = createBrowserRouter([
	{
		element: <App />,
		children: [
			{ path: '/', element: <GuestView /> },
			{ path: '/signup', element: <SignupView /> },
			{ path: '/qr-code', element: <QrCodeView /> },
			{
				path: '/privacy',
				lazy: async () => ({
					Component: (await import('./components/legal/PrivacyPage')).PrivacyPage,
				}),
			},
			{
				path: '/terms',
				lazy: async () => ({
					Component: (await import('./components/legal/TermsPage')).TermsPage,
				}),
			},
			{
				path: '/admin/:view?',
				lazy: async () => ({
					Component: (await import('./components/AdminRoute')).AdminRoute,
				}),
			},
		],
	},
]);
