import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { StorybookConfig } from '@storybook/react-vite';
import remarkMermaid from 'mdx-mermaid';
import { Mermaid } from 'mdx-mermaid/lib/Mermaid';
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

/**
 * Where `npm run capture:screenshots` writes its screenshots, served at `/screenshots` so a docs page can embed
 * one with `<Screenshot id="…" />`. The capture names another folder through the environment when it is
 * asked to write elsewhere. It is made here if it is missing: a static folder that does not exist
 * when Storybook starts is one Storybook will not serve when it appears later.
 */
const screenshotsDirectory =
	process.env.REVIEW_SCREENSHOTS_DIR ??
	fileURLToPath(new URL('../screenshots/png', import.meta.url));

mkdirSync(screenshotsDirectory, { recursive: true });

const config: StorybookConfig = {
	staticDirs: [{ from: screenshotsDirectory, to: '/screenshots' }],
	stories: [
		'./docs/**/*.mdx',
		'./docs/**/*.stories.tsx',
		'../src/**/*.mdx',
		'../src/**/*.stories.tsx',
	],
	addons: [
		{
			name: '@storybook/addon-docs',
			options: {
				remarkPlugins: [[remarkMermaid, { output: 'svg' }]],
				components: { mermaid: Mermaid, Mermaid },
				mdxPluginOptions: {
					mdxCompileOptions: {
						// Add mdx-mermaid as a remark plugin
						remarkPlugins: [remarkMermaid],
					},
				},
			},
		},
		'@storybook/addon-a11y',
	],
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
