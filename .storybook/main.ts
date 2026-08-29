import type { StorybookConfig } from '@storybook/react-vite';
import type { PluginOption } from 'vite';

/**
 * Storybook reuses the project's `vite.config.ts` — that is what gives stories the `@` alias and
 * the React plugin. `@netlify/vite-plugin` is dropped here because it starts the Netlify functions
 * dev server, which a component workshop has no use for.
 */
const excludedPlugins = /netlify/;

/** A flattened plugin list also holds `false`, `null`, and `undefined`, none of which have a name. */
function pluginName(plugin: unknown): string {
	return plugin && typeof plugin === 'object' && 'name' in plugin ? String(plugin.name) : '';
}

const config: StorybookConfig = {
	stories: ['./docs/**/*.mdx', './docs/**/*.stories.tsx', '../src/**/*.stories.tsx'],
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
