import { cp, mkdir, rename, symlink, writeFile } from 'node:fs/promises';
import { createServer as createPortProbe } from 'node:net';
import path from 'node:path';

import { NetlifyDev } from '@netlify/dev';
import { fromWebResponse } from '@netlify/dev-utils';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';

import { DatabaseControl } from './database-control.mjs';
import { startTestIdentity } from './test-identity.mjs';

const source = process.cwd();
const workspace = process.env.QUEUE_RIG_WORKSPACE!;

if (!workspace || !process.env.QUEUE_RIG_STATE) {
	throw new Error('Use the queue test launcher.');
}

// Copy only source inputs: no .env files, linked site state, or persistent development database.
await mkdir(workspace, { recursive: true });

for (const entry of [
	'src',
	'public',
	'db',
	'netlify',
	'index.html',
	'package.json',
	'netlify.toml',
]) {
	await cp(path.join(source, entry), path.join(workspace, entry), { recursive: true });
}
await mkdir(path.join(workspace, 'e2e-queue'));
await cp(
	path.join(source, 'e2e-queue/admin-entry.tsx'),
	path.join(workspace, 'e2e-queue/admin-entry.tsx'),
);
await mkdir(path.join(workspace, 'scripts'));
await cp(path.join(source, 'scripts/fake-data.mts'), path.join(workspace, 'scripts/fake-data.mts'));
await symlink(path.join(source, 'node_modules'), path.join(workspace, 'node_modules'), 'dir');
process.chdir(workspace);
const identity = await startTestIdentity();

process.env.AUTH0_ISSUER = identity.issuer;
process.env.AUTH0_AUDIENCE = identity.audience;
process.env.NOTIFICATIONS_ENABLED = 'false';
const runtime = new NetlifyDev({
	projectRoot: workspace,
	skipGitignore: true,
	serverAddress: null,
	environmentVariables: { enabled: false },
	edgeFunctions: { enabled: false },
	images: { enabled: false },
	geolocation: { enabled: false },
	aiGateway: { enabled: false },
});
let vite: Awaited<ReturnType<typeof createServer>> | undefined;
let control: DatabaseControl | undefined;
let stopping: Promise<void> | undefined;

function stop(): Promise<void> {
	stopping ??= (async () => {
		await vite?.close();
		await control?.stop();
		await runtime.stop();
		await identity.stop();
	})();

	return stopping;
}
process.on('SIGTERM', () => void stop().then(() => process.exit(0)));
process.on('SIGINT', () => void stop().then(() => process.exit(0)));

try {
	await runtime.start();

	if (!runtime.db) {
		throw new Error('Netlify did not create the isolated database.');
	}
	await runtime.db.applyMigrations(path.join(workspace, 'netlify/database/migrations'));
	control = new DatabaseControl(runtime.db);
	const socketPath = path.join(path.dirname(workspace), 'db.sock');

	await control.start(socketPath);
	// Vite treats port 0 as its default port. Reserve an OS-selected port, then require it.
	const probe = createPortProbe();

	await new Promise<void>((resolve, reject) => {
		probe.once('error', reject);
		probe.listen(0, '127.0.0.1', resolve);
	});
	const probeAddress = probe.address();

	if (!probeAddress || typeof probeAddress === 'string') {
		throw new Error('No free server port.');
	}
	const port = probeAddress.port;

	await new Promise<void>((resolve, reject) =>
		probe.close((error) => (error ? reject(error) : resolve())),
	);

	vite = await createServer({
		configFile: false,
		root: workspace,
		envDir: workspace,
		cacheDir: path.join(workspace, '.vite'),
		plugins: [
			react(),
			{
				name: 'queue-netlify-runtime',
				configureServer(server) {
					server.middlewares.use(async (request, response, next) => {
						if (!request.url?.startsWith('/api/')) {
							next();

							return;
						}

						try {
							const result = await control!.run(() =>
								runtime.handleAndIntrospectNodeRequest(request, {
									serverAddress: `http://127.0.0.1:${request.socket.localPort}`,
								}),
							);

							if (result && result.type !== 'static') {
								await fromWebResponse(result.response, response);
							} else {
								next();
							}
						} catch (error) {
							next(error);
						}
					});
				},
			},
		],
		resolve: {
			alias: {
				'@': path.join(workspace, 'src'),
				'./AdminAuthView': path.join(workspace, 'e2e-queue/admin-entry.tsx'),
			},
		},
		server: { host: '127.0.0.1', port, strictPort: true, fs: { allow: [workspace, source] } },
	});
	await vite.listen();
	const address = vite.httpServer?.address();

	if (!address || typeof address === 'string') {
		throw new Error('Vite failed to listen.');
	}

	await writeFile(
		process.env.QUEUE_RIG_STATE + '.tmp',
		JSON.stringify({
			baseURL: `http://127.0.0.1:${address.port}`,
			socketPath,
			adminToken: identity.token,
		}),
		{ mode: 0o600 },
	);
	await rename(process.env.QUEUE_RIG_STATE + '.tmp', process.env.QUEUE_RIG_STATE);
	console.log('Queue rig ready.');
} catch (error) {
	console.error(error);
	await stop();
	process.exit(1);
}
