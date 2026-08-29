import type { StorybookConfig } from '@storybook/react-vite';
import type { PluginOption } from 'vite';

/**
 * A second Storybook, for the React components the app is being migrated to.
 *
 * Storybook takes one framework per configuration, and most of this app is still Vue, so the two
 * run side by side: `npm run storybook` for `.vue`, `npm run storybook:react` for `.tsx`. They
 * merge back into one the moment the last Vue component is gone.
 *
 * Both reuse the project's `vite.config.ts` — that is what gives stories the `@` alias and the
 * framework plugins. The same two plugins are dropped here as in `.storybook/main.ts`:
 * `@netlify/vite-plugin` starts the Netlify functions dev server, and `vite-plugin-vue-devtools`
 * injects an overlay that fights Storybook's own toolbar.
 */
const excludedPlugins = /netlify|devtools|inspect/;

/** A flattened plugin list also holds `false`, `null`, and `undefined`, none of which have a name. */
function pluginName(plugin: unknown): string {
	return plugin && typeof plugin === 'object' && 'name' in plugin ? String(plugin.name) : '';
}

const config: StorybookConfig = {
	stories: ['../src/**/*.stories.tsx'],
	addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
	framework: {
		name: '@storybook/react-vite',
		options: {},
	},
	async viteFinal(viteConfig) {
		// Deliberately widened to `unknown[]`: vite's own `PluginOption` is recursive, and asking
		// TypeScript to resolve `.flat(Infinity)` against it blows the instantiation depth limit.
		const declared = (viteConfig.plugins ?? []) as unknown[];
		const resolved = (await Promise.all(declared)).flat(Infinity);

		viteConfig.plugins = resolved.filter(
			(plugin) => !excludedPlugins.test(pluginName(plugin)),
		) as PluginOption[];

		return viteConfig;
	},
};

export default config;
