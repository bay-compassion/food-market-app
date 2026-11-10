import { defineConfig } from 'electron-vite';

// No renderer: the window loads the deployed app.
export default defineConfig({
	// `src/main/index.ts` → `out/main/index.cjs`, the `main` that package.json names. CommonJS, not
	// the ES module electron-vite would make it in a `"type": "module"` package: node-config, bundled
	// in, declares its own top-level `require`, which collides with the `require` shim electron-vite
	// adds to ES module output. node-config reads `config/` at run time.
	main: {
		build: {
			lib: {
				entry: 'src/main/index.ts',
				formats: ['cjs'],
				fileName: () => 'index.cjs',
			},
		},
	},
	// `src/preload/index.ts` → `out/preload/index.cjs`. A sandboxed preload can't be an ES module.
	preload: {
		build: {
			lib: {
				entry: 'src/preload/index.ts',
				formats: ['cjs'],
				fileName: () => 'index.cjs',
			},
		},
	},
});
