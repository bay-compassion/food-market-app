import { App } from './App';
import { AppErrorPage } from './components/app-error/AppErrorPage';
import { GuestView } from './components/guest-view/GuestView';
import { QrCodeView } from './components/QrCodeView';
import { ClaimView } from './components/routes/ClaimView';
import { SignupView } from './components/routes/SignupView';
import { homeScreenStartPath } from './pwa/home-screen-handoff';
import { createInstrumentedBrowserRouter } from './sentry';
import { premarketPosterPath } from './services/premarket';
import { standbyPosterPath } from './services/qr-posters';

/**
 * Everything a guest does lives in the initial chunk; everything else is loaded on demand.
 *
 * This is not a micro-optimization. A guest registers on a phone, often on a slow connection,
 * inside a fifteen-minute window — the admin dashboard, the reporting tables, and the printable QR
 * poster are all screens a worker opens on a desk, and none of them should be in the download
 * that stands between a guest and the queue.
 */
export const router = createInstrumentedBrowserRouter([
	{
		// Without this, a screen that throws is replaced by React Router's own fallback: an unstyled
		// "Unexpected Application Error!" in English on an otherwise blank page. One pathless route
		// over all of them gives every screen the same localized recovery, including a lazily
		// loaded one whose chunk failed to download, and an address that matches no route.
		errorElement: <AppErrorPage />,
		children: [
			{
				path: '/holding',
				lazy: async () => ({
					Component: (await import('./components/holding-page/HoldingPage')).HoldingPage,
				}),
			},
			{
				element: <App />,
				children: [
					{ path: '/', element: <GuestView /> },
					{ path: homeScreenStartPath, element: <GuestView /> },
					{ path: '/signup', element: <SignupView /> },
					// A guest reaches this from a worker's QR code while standing at the table.
					{ path: '/claim', element: <ClaimView /> },
					{ path: '/qr-code', element: <QrCodeView /> },
					{
						// A volunteer reaches this from the premarket QR code or link. Guests never do, so it is
						// lazily loaded, out of their download — which also keeps it from being advertised.
						path: '/premarket',
						lazy: async () => ({
							Component: (await import('./components/premarket/PremarketPage')).PremarketPage,
						}),
					},
					{
						// A guest reaches this only by scanning the standby iPads' QR code at the market, so it
						// is lazily loaded, out of the guest download, and linked from nowhere: standby is
						// never advertised.
						path: '/standby',
						lazy: async () => ({
							Component: (await import('./components/standby/StandbyPage')).StandbyPage,
						}),
					},
					{
						path: '/help',
						lazy: async () => ({
							Component: (await import('./components/help/HelpPage')).HelpPage,
						}),
					},
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
						// A static segment outranks `/admin/:view?` below, so this never reaches the dashboard.
						path: premarketPosterPath,
						lazy: async () => ({
							Component: (await import('./components/admin/PremarketPosterRoute'))
								.PremarketPosterRoute,
						}),
					},
					{
						// Static too, for the same reason.
						path: standbyPosterPath,
						lazy: async () => ({
							Component: (await import('./components/admin/StandbyPosterRoute')).StandbyPosterRoute,
						}),
					},
					{
						// The second segment opens something within a screen: an ended session's participants.
						path: '/admin/:view?/:item?',
						lazy: async () => ({
							Component: (await import('./components/AdminRoute')).AdminRoute,
						}),
					},
				],
			},
			// Outside the app shell: a volunteer's phone gets the whole screen for the line.
			{
				path: '/queue',
				lazy: async () => ({
					Component: (await import('./components/queue/QueueRoute')).QueueRoute,
				}),
			},
			// Outside the app shell, and every other download: named stewards see draw odds here.
			{
				path: '/steward/:view?',
				lazy: async () => ({
					Component: (await import('./components/steward/StewardRoute')).StewardRoute,
				}),
			},
			// Outside the app shell: a desktop that prints the name tags volunteers send from their phones.
			{
				path: '/printing-station',
				lazy: async () => ({
					Component: (await import('./components/print-station/PrintStation')).PrintStationRoute,
				}),
			},
			// Outside the app shell: a room display shows no bar, menu, or footer for a passer-by to tap.
			{
				path: '/kiosk',
				lazy: async () => ({
					Component: (await import('./components/kiosk/KioskView')).KioskView,
				}),
			},
		],
	},
]);
