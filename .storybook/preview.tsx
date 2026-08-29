import type { Preview } from '@storybook/react-vite';
import { useState } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { INITIAL_VIEWPORTS } from 'storybook/viewport';

import { AppThemeProvider } from '../src/components/AppThemeProvider';
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
	},

	initialGlobals: {
		locale: 'en' satisfies Locale,
		// This is a mobile-first product, so a story opens at phone width unless told otherwise.
		viewport: { value: 'iphone14', isRotated: false },
	},

	parameters: {
		layout: 'fullscreen',
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
		 * provides the root store the app would provide in real use.
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

			// A router as well as the store: a component that navigates (the Preregister button, the
			// app bar's mode toggle) throws outright without one, rather than merely failing to move.
			const router = createMemoryRouter([
				{
					path: '*',
					element: (
						<div className={shells[shell]} dir={store.translations.dir}>
							<Story />
						</div>
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
