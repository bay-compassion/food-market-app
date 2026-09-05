import { spawn, type ChildProcess } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { access, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const root = process.cwd();

if (process.env.NETLIFY_DB_URL) {
	throw new Error('Unset NETLIFY_DB_URL. The queue rig creates and owns its database.');
}
const directory = await mkdtemp(path.join(tmpdir(), 'queue-rig-'));
const state = path.join(directory, 'state.json');

await mkdir('test-results', { recursive: true });
const log = createWriteStream('test-results/queue-server.log');
// Do not inherit app credentials, VITE_* settings, or Netlify account configuration.
const environment: NodeJS.ProcessEnv = {};

for (const key of ['PATH', 'HOME', 'TMPDIR', 'CI', 'TERM', 'DISPLAY', 'PLAYWRIGHT_BROWSERS_PATH']) {
	if (process.env[key]) {
		environment[key] = process.env[key];
	}
}
environment.PGUSER = 'postgres';
environment.QUEUE_RIG_STATE = state;
environment.QUEUE_RIG_WORKSPACE = path.join(directory, 'app');
const server = spawn(process.execPath, ['--import', 'tsx', 'e2e-queue/server.mts'], {
	cwd: root,
	env: environment,
	stdio: ['ignore', 'pipe', 'pipe'],
});

server.stdout.pipe(log, { end: false });
server.stderr.pipe(log, { end: false });
let playwright: ChildProcess | undefined;
let interrupted = false;

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
	process.on(signal, () => {
		interrupted = true;
		playwright?.kill(signal);
		server.kill(signal);
	});
}

async function stop(child: ChildProcess) {
	if (child.exitCode !== null || child.signalCode !== null) {
		return;
	}
	const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));

	child.kill('SIGTERM');
	const force = setTimeout(() => child.kill('SIGKILL'), 10_000);

	await exited;
	clearTimeout(force);
}

try {
	console.log('Starting isolated Netlify queue rig (logs: test-results/queue-server.log)…');
	const deadline = Date.now() + 120_000;

	while (true) {
		if (interrupted || server.exitCode !== null || server.signalCode !== null) {
			throw new Error('Queue server stopped. See test-results/queue-server.log.');
		}

		try {
			await access(state);
			break;
		} catch {
			/* Server is still starting. */
		}

		if (Date.now() > deadline) {
			throw new Error('Queue server startup timed out. See server log.');
		}
		await delay(200);
	}
	playwright = spawn(
		process.execPath,
		[
			'node_modules/@playwright/test/cli.js',
			'test',
			'--config=playwright.queue.config.ts',
			...process.argv.slice(2),
		],
		{ cwd: root, env: environment, stdio: 'inherit' },
	);
	process.exitCode = await new Promise<number>((resolve, reject) => {
		playwright!.once('error', reject);
		playwright!.once('exit', (code) => resolve(code ?? 1));
	});
} finally {
	if (playwright) {
		await stop(playwright);
	}
	await stop(server);
	log.end();
	await rm(directory, { recursive: true, force: true });
}
