import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { createServer, type ViteDevServer } from 'vite';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));

/**
 * The running app the stills are photographed from.
 *
 * It is the real app — the same `src/` a guest's phone loads — with every `/api` call answered by
 * the capture rather than by a backend, so there is no database, Netlify runtime, or Auth0 tenant to
 * stand up. This is a Vite server of its own rather than `vite.config.ts`, because that config
 * mounts the Netlify runtime, which a capture has no use for.
 */
export class AppServer {
	private constructor(
		readonly baseUrl: string,
		private readonly vite?: ViteDevServer,
	) {}

	/** Adopts an already-running `npm run dev`, which is how you want to work while iterating. */
	static existing(baseUrl: string): AppServer {
		return new AppServer(baseUrl.replace(/\/$/, ''));
	}

	static async start(port: number): Promise<AppServer> {
		const vite = await createServer({
			configFile: false,
			root: repositoryRoot,
			plugins: [react()],
			// A name nothing is called, so no `VITE_*` value reaches the app from a developer's `.env`
			// or shell. A stills run must stay off Sentry, LaunchDarkly, and Auth0 whatever this
			// machine has configured, and must look like the fresh clone the guests' screens are
			// written against.
			envPrefix: 'BAY_COMPASSION_STILLS_NEVER_MATCHES_',
			define: { __SENTRY_DEBUG__: 'false' },
			resolve: { alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) } },
			logLevel: 'warn',
			server: { host: '127.0.0.1', port, strictPort: true },
		});

		await vite.listen();

		return new AppServer(`http://127.0.0.1:${port}`, vite);
	}

	async [Symbol.asyncDispose](): Promise<void> {
		await this.vite?.close();
	}
}
