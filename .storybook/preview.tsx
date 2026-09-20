import type { Preview } from '@storybook/react-vite';
import { useState } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { INITIAL_VIEWPORTS } from 'storybook/viewport';

import { AppFooter } from '../src/components/AppFooter';
import { AppThemeProvider } from '../src/components/AppThemeProvider';
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
				items: languages.map((language) => ({ value: language.code, title: language.label })),
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
	},

	initialGlobals: {
		locale: 'en' satisfies Locale,
		appFrame: 'off',
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
					'Guest',
					// The review document prints its sections in this order, so it is the document's outline.
					[
						'Introduction',
						'Forms',
						'Guest States',
						'Loading and Unavailable',
						'Text Updates',
						'Identity Menu',
						'QR Codes',
						'Text Messages',
					],
					'Components',
					'Admin',
					// Match adminViews in src/services/admin-views.ts, with shared components last.
					[
						'Current Session',
						'Schedule',
						'Queue',
						'Broadcast',
						'Question Bank',
						'Guest Database',
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
		controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
	},

	decorators: [
		/**
		 * Feeds the toolbar's locale into the story's `locale` prop. Only stories that already
		 * declare a `locale` arg get it — otherwise React would warn about an unknown prop on
		 * components that have none.
		 */
		(Story, context) =>
			'locale' in context.initialArgs ? (
				<Story args={{ ...context.args, locale: context.globals.locale as Locale }} />
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
									<Story />
								</div>
							)}
							<ConfirmationDrawer />
							<NotificationToasts />
						</>
					),
				},
			]);

			return (
				<AppThemeProvider>
					<RootStoreProvider store={store}>
						<RouterProvider router={router} />
					</RootStoreProvider>
				</AppThemeProvider>
			);
		},
	],
};

export default preview;
