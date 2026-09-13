import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

/**
 * Storybook is the stills' source of truth. Its story index already enumerates every state the
 * components can be in — including the ones the running app cannot easily be driven into — and its
 * titles already carry the grouping, so the capture never has to describe a state itself.
 */
export type StorybookStory = {
	id: string;
	/** The story's path in the sidebar, e.g. `Guest/Session States/GuestVisitStatus`. */
	title: string;
	/** The individual state, e.g. `Waiting Next`. */
	name: string;
	tags: string[];
};

type StoryIndexEntry = StorybookStory & { type: string };

type StoryIndex = { entries: Record<string, StoryIndexEntry> };

function isStoryIndex(value: unknown): value is StoryIndex {
	return typeof value === 'object' && value !== null && 'entries' in value;
}

/** Every `story` entry, in the order Storybook lists them, which is the sidebar's order. */
export async function fetchStories(baseUrl: string): Promise<StorybookStory[]> {
	const response = await fetch(new URL('index.json', `${baseUrl}/`));

	if (!response.ok) {
		throw new Error(`Storybook at ${baseUrl} answered ${response.status} for its story index.`);
	}

	const index: unknown = await response.json();

	if (!isStoryIndex(index)) {
		throw new Error(`Storybook at ${baseUrl} returned a story index in an unfamiliar shape.`);
	}

	return Object.values(index.entries)
		.filter((entry) => entry.type === 'story')
		.map(({ id, title, name, tags }) => ({ id, title, name, tags: tags ?? [] }));
}

/** The story's own page, without the manager chrome around it. */
export function storyUrl(baseUrl: string, storyId: string, globals?: string): string {
	const url = new URL('iframe.html', `${baseUrl}/`);

	url.searchParams.set('id', storyId);
	url.searchParams.set('viewMode', 'story');

	if (globals) {
		url.searchParams.set('globals', globals);
	}

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
 * A Storybook to capture from: either one the caller already has running — which is how you want to
 * work while you are iterating on a sheet — or one started for the run and shut down after it.
 */
export class StorybookServer {
	private process: ChildProcess | undefined;

	private constructor(readonly baseUrl: string) {}

	/** Adopts an already-running Storybook. */
	static existing(baseUrl: string): StorybookServer {
		return new StorybookServer(baseUrl.replace(/\/$/, ''));
	}

	/** Starts `storybook dev` on `port` and resolves once it is answering for its story index. */
	static async start(port: number, timeoutMs = 180_000): Promise<StorybookServer> {
		const server = new StorybookServer(`http://127.0.0.1:${port}`);

		if (await isListening(server.baseUrl)) {
			return server;
		}

		server.process = spawn(
			'npx',
			['storybook', 'dev', '-p', String(port), '--ci', '--quiet', '--no-open'],
			// Its own process group, so shutting it down takes the Vite server it spawns with it.
			{ stdio: ['ignore', 'ignore', 'inherit'], detached: true },
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
