import type { StorybookConfig } from '@storybook/vue3-vite';
import type { PluginOption } from 'vite';

/**
 * Storybook reuses the project's `vite.config.ts` — that is what gives stories the `@` alias and
 * the Vue plugin, since `@storybook/vue3-vite` deliberately does not supply its own. Two of that
 * config's plugins have no place here: `@netlify/vite-plugin` starts the Netlify functions dev
 * server, and `vite-plugin-vue-devtools` injects an overlay that fights Storybook's own toolbar.
 *
 * Matching on the name rather than the import is what keeps this working: `vueDevTools()` expands
 * into four plugins (`vite-plugin-inspect`, two `vite-plugin-vue-inspector` passes, and
 * `vite-plugin-vue-devtools`), and it hands them back as a promise of an array, so the list has to
 * be awaited and flattened before anything can be matched against it.
 */
const excludedPlugins = /netlify|devtools|inspect/;

/** A flattened plugin list also holds `false`, `null`, and `undefined`, none of which have a name. */
function pluginName(plugin: unknown): string {
	return plugin && typeof plugin === 'object' && 'name' in plugin ? String(plugin.name) : '';
}

const config: StorybookConfig = {
	// Stories sit beside the components they document; the design system pages are Storybook-only
	// content, so they stay out of `src/` rather than adding a docs folder to the app source.
	stories: ['../src/**/*.stories.ts', './docs/**/*.stories.ts', './docs/**/*.mdx'],
	addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest'],
	framework: {
		name: '@storybook/vue3-vite',
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
