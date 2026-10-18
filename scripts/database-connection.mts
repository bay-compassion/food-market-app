/**
 * How the command-line database scripts find and reach a database. Shared by `seed-fake-data.mts`,
 * which only ever targets a local one, and `delete-guest.mts`, whose real target is production.
 */

import { readFileSync } from 'node:fs';

const localHosts = ['localhost', '127.0.0.1', '::1'];

/**
 * Finds the database the same way the Netlify CLI's own `netlify db` commands do: an explicit
 * `NETLIFY_DB_URL` wins, and otherwise a running `netlify dev` will have recorded the local
 * database it provisioned in `.netlify/state.json`. That entry only exists while `netlify dev`
 * is running — the local database lives inside that process.
 */
export function resolveConnectionString() {
	if (process.env.NETLIFY_DB_URL) {
		return process.env.NETLIFY_DB_URL;
	}

	try {
		const statePath = new URL('../.netlify/state.json', import.meta.url);
		const state = JSON.parse(readFileSync(statePath, 'utf8')) as { dbConnectionString?: unknown };

		if (typeof state.dbConnectionString === 'string' && state.dbConnectionString) {
			return state.dbConnectionString;
		}
	} catch {
		// No local Netlify state — treated the same as not having a database.
	}

	return null;
}

export function databaseHost(connectionString: string) {
	try {
		return new URL(connectionString).hostname.replace(/^\[|\]$/g, '');
	} catch {
		return null;
	}
}

export function isLocalDatabase(connectionString: string) {
	const host = databaseHost(connectionString);

	return host !== null && localHosts.includes(host);
}

/**
 * Points `db/index.mts` at this database. The client reads these when it is first imported, so
 * call this before importing it. `server` picks the plain Postgres driver: what a local database
 * speaks, and what Neon accepts too over TLS, with transactions on either.
 */
export function useDatabase(connectionString: string) {
	process.env.NETLIFY_DB_URL = connectionString;
	process.env.NETLIFY_DB_DRIVER ??= 'server';
}

/**
 * Drizzle reports a failed query as its own `Failed query: ...` and keeps the Postgres error — the
 * one that actually says what was wrong — on `cause`. Print both, or debugging is guesswork.
 */
export function reportFailure(error: unknown) {
	if (error instanceof Error) {
		console.error(error.message.split('\n')[0]);

		if (error.cause instanceof Error) {
			console.error(error.cause.message);
		}
	} else {
		console.error(error);
	}
}
