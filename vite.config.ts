import { fileURLToPath, URL } from 'node:url';

import netlify from '@netlify/vite-plugin';
import react from '@vitejs/plugin-react-swc';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import vueDevTools from 'vite-plugin-vue-devtools';

/**
 * Both framework plugins are registered while the app is being migrated from Vue to React. They do
 * not overlap: `@vitejs/plugin-vue` claims `.vue`, and the React plugin claims `.jsx`/`.tsx`, so a
 * file is only ever handled by one of them.
 *
 * The React plugin is the SWC one rather than the default Babel one on purpose.
 * `vite-plugin-vue-devtools` pins `@babel/core` 7 through `vite-plugin-vue-inspector`, while
 * `@vitejs/plugin-react`'s optional Babel path wants `@babel/core` 8 — an unresolvable peer
 * conflict for as long as both frameworks are installed. SWC uses no Babel at all and declares
 * support for Vite 8, so the two coexist without `--legacy-peer-deps` or a version override.
 */
// https://vite.dev/config/
export default defineConfig({
	plugins: [vue(), react(), vueDevTools(), netlify()],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
});
