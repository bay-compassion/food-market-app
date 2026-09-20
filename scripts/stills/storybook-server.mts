import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

/**
 * The tag an MDX docs page puts on its `<Meta>` to be printed in the review document:
 *
 *     <Meta title="Guest/Forms" tags={['review']} />
 *
 * The pages, and the words on them, are written in Storybook by whoever owns the explanation; this
 * is the whole of what the capture needs to know about them.
 */
export const reviewTag = 'review';

/** A docs page that asked to be printed. */
export type ReviewDoc = {
	/** The docs entry's id, e.g. `guest-forms--docs` — the `id` in its Storybook URL. */
	id: string;
	/** Its sidebar path, e.g. `Guest/Forms`. */
	title: string;
	/** The last part of the path, e.g. `Forms`, which is what the document calls the page. */
	label: string;
};

type IndexEntry = { id: string; title: string; type: string; tags?: string[] };

type StoryIndex = { entries: Record<string, IndexEntry> };

function isStoryIndex(value: unknown): value is StoryIndex {
	return typeof value === 'object' && value !== null && 'entries' in value;
}

/**
 * Every docs page tagged for review, in sidebar-path order — the order a reader would find them in
 * Storybook, since the index itself lists them in whatever order the files were discovered.
 */
export async function fetchReviewDocs(baseUrl: string): Promise<ReviewDoc[]> {
	const response = await fetch(new URL('index.json', `${baseUrl}/`));

	if (!response.ok) {
		throw new Error(`Storybook at ${baseUrl} answered ${response.status} for its story index.`);
	}

	const index: unknown = await response.json();

	if (!isStoryIndex(index)) {
		throw new Error(`Storybook at ${baseUrl} returned a story index in an unfamiliar shape.`);
	}

	return Object.values(index.entries)
		.filter((entry) => entry.type === 'docs' && entry.tags?.includes(reviewTag))
		.map(({ id, title }) => ({ id, title, label: title.split('/').at(-1) ?? title }))
		.sort((first, second) => first.title.localeCompare(second.title));
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
