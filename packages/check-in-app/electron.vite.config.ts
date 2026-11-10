import { defineConfig } from 'electron-vite';

// The main process only: the window loads the deployed app, so there is no renderer to build.
// `src/main/index.ts` compiles to `out/main/index.js`, the `main` that package.json names.
export default defineConfig({
	main: {},
});
