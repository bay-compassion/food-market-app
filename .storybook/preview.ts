import type { Preview } from '@storybook/vue3-vite';
import { INITIAL_VIEWPORTS } from 'storybook/viewport';
import { provide } from 'vue';

import { languages, type Locale } from '../src/locales';
import { RootStore, rootStoreKey } from '../src/stores/root.store';

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
		options: {
			storySort: {
				order: [
					'Design System',
					['Introduction', 'Colors', 'Typography', 'Shape and layout'],
					'Primitives',
					'Guest',
					'Admin',
				],
			},
		},
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
		 * declare a `locale` arg get it — otherwise Vue would drop a stray `locale` attribute onto
		 * components such as `AppButton` that have no such prop.
		 */
		(story, context) =>
			'locale' in context.initialArgs
				? story({ args: { ...context.args, locale: context.globals.locale as Locale } })
				: story(),

		/**
		 * Wraps the story in its page shell and the writing direction its locale calls for, and
		 * provides the root store the shell would provide in the real app.
		 *
		 * The store is not optional scaffolding: `useTranslation()` reads it through `useStore()`,
		 * which throws when nothing is provided, so any component resolving its own copy — rather
		 * than taking every string as a prop — cannot render at all without this. Each story gets a
		 * fresh instance, so one story's writes cannot leak into the next.
		 */
		(story, context) => ({
			components: { story },
			setup() {
				const store = new RootStore();
				const shell: Shell = (context.parameters.shell as Shell | undefined) ?? 'bare';

				store.translations.setLanguage(context.globals.locale as Locale);
				provide(rootStoreKey, store);

				return { shellClass: shells[shell], direction: store.translations.dir };
			},
			template: '<div :class="shellClass" :dir="direction"><story /></div>',
		}),
	],
};

export default preview;
