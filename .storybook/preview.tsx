import type { Preview } from '@storybook/react-vite';
import { useState } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { INITIAL_VIEWPORTS } from 'storybook/viewport';

import { AdminThemeProvider } from '../src/components/admin/AdminThemeProvider';
import { AppFooter } from '../src/components/AppFooter';
import { AppThemeProvider } from '../src/components/AppThemeProvider';
import { StaticLDProvider } from '../src/components/StaticLDProvider';
import { AppBar } from '../src/components/ui/app-bar/AppBar';
import { ConfirmationDrawer } from '../src/components/ui/ConfirmationDrawer';
import { NotificationToasts } from '../src/components/ui/NotificationToasts';
import { languages, type Locale } from '../src/locales';
import { RootStoreProvider } from '../src/stores/react/store-context';
import { RootStore } from '../src/stores/root.store';

// The app's own stylesheets, in the same order `main.ts` loads them, so a story in isolation
// inherits exactly the cascade it would get inside the running app.
import '../src/styles/base.css';
import '../src/styles/app-shell.css';
import '../src/styles/admin.css';
import './preview.css';

// Light before any story mounts, as the guides' frames are: a docs page with no story on it never
// mounts `AppThemeProvider` to set this, and the token specimens read their values before it does.
document.documentElement.dataset.theme = 'light';

/**
 * Which of the app's page wrappers a story renders inside, set per story with
 * `parameters: { shell: 'admin' }`.
 *
 * This matters more than it looks: every rule in `admin.css` is prefixed `.admin-dashboard`, so an
 * admin component rendered without its shell is not merely mispositioned — it is unstyled.
 */
const shells = {
	guest: 'guest-layout',
	admin: 'admin-dashboard sb-admin-shell',
	bare: 'sb-bare-shell',
} as const;

type Shell = keyof typeof shells;

const preview: Preview = {
	globalTypes: {
		locale: {
			description: 'Language to render the story in',
			toolbar: {
				title: 'Locale',
				icon: 'globe',
				items: languages.map((language) => ({
					value: language.code,
					title: language.label,
				})),
				dynamicTitle: true,
			},
		},
		appFrame: {
			description: 'Show guest stories inside the app bar and footer, as a guest sees them',
			toolbar: {
				title: 'App frame',
				icon: 'browser',
				items: [
					{ value: 'off', title: 'Story only' },
					{ value: 'on', title: 'Inside the app' },
				],
				dynamicTitle: true,
			},
		},
		colorScheme: {
			description: 'Keep stories light, or follow the device into dark mode',
			toolbar: {
				title: 'Color scheme',
				icon: 'contrast',
				items: [
					{ value: 'light', title: 'Light' },
					{ value: 'system', title: 'Follow the device' },
				],
				dynamicTitle: true,
			},
		},
	},

	initialGlobals: {
		locale: 'en' satisfies Locale,
		appFrame: 'off',
		// Light unless asked, so the review document and the story tests do not change with the
		// machine they run on. Dark mode is reviewed by following a device set to dark.
		colorScheme: 'light',
		// This is a mobile-first product, so a story opens at phone width unless told otherwise.
		viewport: { value: 'iphone14', isRotated: false },
	},

	parameters: {
		layout: 'fullscreen',
		options: {
			storySort: {
				order: [
					'Design System',
					'Primitives',
					[
						'Alert',
						'App Bar',
						'Button',
						'Card',
						'Confirmation Drawer',
						'Dialog',
						'Eyebrow Label',
						'Number Spinner',
						'Phone Field',
						'Text Field',
						'Underline Button',
					],
					// The review document's pages. It prints its sections in this order, so this list is
					// the document's outline.
					'Guest Review',
					[
						'Introduction',
						'Forms',
						'Text Messages',
						'Guest States',
						'Loading and Unavailable',
						'Text Updates',
						'Identity Menu',
						'QR Codes',
					],
					// Guest component stories, in the order a guest meets each screen.
					'Guest',
					[
						'Market Page',
						[
							'All States',
							'Not Open',
							'Registration Countdown',
							'Registration Closed',
							'Service in Progress',
						],
						'First Visit',
						'Registration',
						'Visit',
						// The design first; the flag's fallbacks after it.
						[
							'Status',
							'Refresh Notice',
							'Guests Ahead (Flagged)',
							['Status', 'Line Position Dots'],
						],
						'Identity',
						'Text Messages',
						'Other Pages',
					],
					// Staff-facing screens outside the dashboard: the kiosk board and the queue desk.
					'Staff',
					[
						'Kiosk',
						['Board', 'Language Pill'],
						'Queue Desk',
						['Line', 'Name Tag Card', 'Room Display Code'],
					],
					'Admin',
					// Match adminViews in src/services/admin-views.ts, with shared components last.
					[
						'Current Session',
						'Queue',
						['Queue', 'Guest Row'],
						'Broadcast',
						'Schedule',
						'Question Bank',
						'Guest Database',
						['Database View', 'Guest Grid'],
						'Session History',
						'Reports',
						'Dev Mode',
						'Shared',
					],
				],
			},
		},
		viewport: { options: INITIAL_VIEWPORTS },
		// 'todo' surfaces accessibility findings in the panel without failing the story test run.
		// Switch a story to 'error' once its violations are cleared to keep them from coming back.
		a11y: { test: 'todo' },
		controls: {
			matchers: { color: /(background|color)$/i, date: /Date$/i },
		},
	},

	decorators: [
		/**
		 * Provides the LaunchDarkly client a flag-reading component needs — `useBoolVariation` throws
		 * without one in its tree, the same failure mode `useRootStore()` has with no `RootStoreProvider`.
		 * Every flag defaults to whatever the reading hook itself defaults to (see `StaticLDProvider`),
		 * which is what a story sees for a flag it never mentions. A story that wants to see a flag's
		 * other state nests its own `StaticLDProvider`, which wins over this one.
		 */
		(Story) => (
			<StaticLDProvider>
				<Story />
			</StaticLDProvider>
		),

		/**
		 * Feeds the toolbar's locale into the story's `locale` prop. Only stories that already
		 * declare a `locale` arg get it — otherwise React would warn about an unknown prop on
		 * components that have none.
		 */
		(Story, context) =>
			'locale' in context.initialArgs ? (
				<Story
					args={{
						...context.args,
						locale: context.globals.locale as Locale,
					}}
				/>
			) : (
				<Story />
			),

		/**
		 * Wraps the story in its page shell and the writing direction its locale calls for, and
		 * provides the root store the app would provide in real use — along with the confirmation
		 * sheet and toasts `App` mounts, so a story whose component asks for confirmation or raises
		 * a notification actually shows it.
		 *
		 * The store is not optional scaffolding: `useRootStore()` throws without a provider, so any
		 * component resolving its own copy — rather than taking every string as a prop — cannot
		 * render at all without this. Each story gets a fresh instance, so one story's writes cannot
		 * leak into the next.
		 */
		(Story, context) => {
			// Built once per story, not once per render: a decorator is a component, and rebuilding
			// the store on every render would throw away everything a `play` function just did to it.
			const [store] = useState(() => {
				const created = new RootStore();

				created.translations.setLanguage(context.globals.locale as Locale);

				return created;
			});
			const shell: Shell = (context.parameters.shell as Shell | undefined) ?? 'bare';
			const framed = context.globals.appFrame === 'on' && shell === 'guest';

			// A router as well as the store: a component that navigates (the save-information button, the
			// app bar's mode toggle) throws outright without one, rather than merely failing to move.
			const router = createMemoryRouter([
				{
					path: '*',
					element: (
						<>
							{framed ? (
								// The chrome `App` puts around every route, so a guest story reads as the screen
								// it is part of. Only guest stories: an admin screen has no app bar to sit under.
								<main className="app-shell sb-app-frame" dir={store.translations.dir}>
									<AppBar />
									<div className={shells.guest}>
										<Story />
									</div>
									<AppFooter />
								</main>
							) : (
								<div className={shells[shell]} dir={store.translations.dir}>
									{shell === 'admin' ? (
										// What `AdminDashboardLayout` provides around every admin screen.
										<AdminThemeProvider>
											<Story />
										</AdminThemeProvider>
									) : (
										<Story />
									)}
								</div>
							)}
							<ConfirmationDrawer />
							<NotificationToasts />
						</>
					),
				},
			]);

			const colorScheme = context.globals.colorScheme === 'system' ? 'system' : 'light';

			return (
				// Keyed on the scheme: the provider reads its mode once, when it mounts.
				<AppThemeProvider key={colorScheme} mode={colorScheme}>
					<RootStoreProvider store={store}>
						<RouterProvider router={router} />
					</RootStoreProvider>
				</AppThemeProvider>
			);
		},
	],
};

export default preview;
