import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

import { isStoryIndex, reviewPages, type ReviewPage } from '../../.storybook/docs/review-index.js';

/**
 * The docs pages that make up the review document, read from Storybook's own index. A page joins by
 * tagging itself — `<Meta title="Guest/Forms" tags={['review']} />` — and the words on it are the
 * document's words; this is the whole of what the capture needs to know about them. See
 * `.storybook/docs/review-index.ts`, which the contents page uses too.
 */
export async function fetchReviewPages(baseUrl: string): Promise<ReviewPage[]> {
	const response = await fetch(new URL('index.json', `${baseUrl}/`));

	if (!response.ok) {
		throw new Error(`Storybook at ${baseUrl} answered ${response.status} for its story index.`);
	}

	const index: unknown = await response.json();

	if (!isStoryIndex(index)) {
		throw new Error(`Storybook at ${baseUrl} returned a story index in an unfamiliar shape.`);
	}

	return reviewPages(index);
}

/**
 * A docs page on its own, without the manager chrome around it.
 *
 * `globals` reach every story embedded in the page, which is how the whole document is put in one
 * language and inside the app's own bar and footer without any page saying so.
 */
export function docsUrl(baseUrl: string, docId: string, globals: Record<string, string>): string {
	const url = new URL('iframe.html', `${baseUrl}/`);

	url.searchParams.set('id', docId);
	url.searchParams.set('viewMode', 'docs');
	url.searchParams.set(
		'globals',
		Object.entries(globals)
			.map(([name, value]) => `${name}:${value}`)
			.join(';'),
	);

	return url.href;
}

async function isListening(baseUrl: string): Promise<boolean> {
	try {
		return (await fetch(new URL('index.json', `${baseUrl}/`))).ok;
	} catch {
		return false;
	}
}

/**
 * A Storybook to print docs pages from: either one already running — which is how you want to work
 * while you are writing a page — or one started for the run and shut down after it.
 */
export class StorybookServer {
	private process: ChildProcess | undefined;

	private constructor(readonly baseUrl: string) {}

	/** Adopts an already-running Storybook. */
	static existing(baseUrl: string): StorybookServer {
		return new StorybookServer(baseUrl.replace(/\/$/, ''));
	}

	/** Starts `storybook dev` on `port` and resolves once it is answering for its story index. */
	static async start(
		port: number,
		options: { env?: Record<string, string>; timeoutMs?: number } = {},
	): Promise<StorybookServer> {
		const { env = {}, timeoutMs = 180_000 } = options;
		const server = new StorybookServer(`http://127.0.0.1:${port}`);

		if (await isListening(server.baseUrl)) {
			return server;
		}

		server.process = spawn(
			'npx',
			['storybook', 'dev', '-p', String(port), '--ci', '--quiet', '--no-open'],
			// Its own process group, so shutting it down takes the Vite server it spawns with it.
			{ stdio: ['ignore', 'ignore', 'inherit'], detached: true, env: { ...process.env, ...env } },
		);

		const deadline = Date.now() + timeoutMs;

		while (Date.now() < deadline) {
			if (server.process.exitCode !== null) {
				throw new Error(`Storybook exited with code ${server.process.exitCode} before starting.`);
			}

			if (await isListening(server.baseUrl)) {
				return server;
			}

			await delay(500);
		}

		await server[Symbol.asyncDispose]();

		throw new Error(`Storybook did not start on port ${port} within ${timeoutMs / 1000}s.`);
	}

	async [Symbol.asyncDispose](): Promise<void> {
		const child = this.process;

		if (!child?.pid || child.exitCode !== null) {
			return;
		}

		this.process = undefined;
		process.kill(-child.pid, 'SIGTERM');
		await Promise.race([new Promise((resolve) => child.once('exit', resolve)), delay(5_000)]);
	}
}
