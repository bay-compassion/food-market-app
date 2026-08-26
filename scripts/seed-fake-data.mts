#!/usr/bin/env node

/**
 * Fills a database with fake market history so the admin screens, the reports, and the CSV export
 * have something realistic to show. Written for the throwaway Postgres that `netlify dev`
 * provisions locally, so leave `npm start` running in another terminal — that database lives
 * inside the dev server process and is only reachable while it is up.
 *
 * Usage:
 *   npm run seed                                # 12 past weekly sessions, 120 guests
 *   npm run seed -- --sessions=26 --guests=300  # a longer history
 *   npm run seed -- --open-session              # also open a session for registration today
 *   npm run seed -- --reset                     # delete every existing row first
 *
 * Runs append: use `--reset` for a clean slate.
 */

import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { sql } from 'drizzle-orm';

import { buildFakeData, type FakeData } from './fake-data.mjs';

const localHosts = ['localhost', '127.0.0.1', '::1'];

const usage = `Usage: npm run seed -- [options]

  --sessions=N     past weekly sessions to generate (default 12)
  --guests=N       size of the guest pool (default 120)
  --capacity=N     queue capacity per session (default 45)
  --seed=N         random seed; the same seed replays the same history (default 1)
  --open-session   also add a session open for registration today
  --reset          delete every existing row before seeding
  --force          allow seeding a database that is not on localhost
  --help           show this message
`;

function parseOptions() {
	const { values } = parseArgs({
		options: {
			sessions: { type: 'string', default: '12' },
			guests: { type: 'string', default: '120' },
			capacity: { type: 'string', default: '45' },
			seed: { type: 'string', default: '1' },
			'open-session': { type: 'boolean', default: false },
			reset: { type: 'boolean', default: false },
			force: { type: 'boolean', default: false },
			help: { type: 'boolean', default: false },
		},
	});

	return values;
}

function positiveNumber(value: string, name: string) {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < 1) {
		throw new Error(`--${name} must be a whole number of at least 1.`);
	}

	return parsed;
}

/**
 * Finds the database the same way the Netlify CLI's own `netlify db` commands do: an explicit
 * `NETLIFY_DB_URL` wins, and otherwise a running `netlify dev` will have recorded the local
 * database it provisioned in `.netlify/state.json`. That entry only exists while `netlify dev`
 * is running — the local database lives inside that process.
 */
function resolveConnectionString() {
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

function isLocalDatabase(connectionString: string) {
	try {
		return localHosts.includes(new URL(connectionString).hostname.replace(/^\[|\]$/g, ''));
	} catch {
		return false;
	}
}

function chunk<T>(items: T[], size: number) {
	const chunks: T[][] = [];
	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}

	return chunks;
}

function summarize(data: FakeData) {
	const counts = new Map<string, number>();
	for (const visit of data.visits) {
		counts.set(visit.status, (counts.get(visit.status) ?? 0) + 1);
	}
	const statuses = [...counts.entries()]
		.sort(([first], [second]) => first.localeCompare(second))
		.map(([status, count]) => `${status} ${count}`)
		.join(', ');

	console.log(
		`Seeded ${data.sessions.length} sessions, ${data.guests.length} guests, ${
			data.visits.length
		} visits.`,
	);
	console.log(`Visits by status: ${statuses}.`);
}

async function main() {
	const values = parseOptions();
	if (values.help) {
		console.log(usage);

		return;
	}

	const connectionString = resolveConnectionString();
	if (!connectionString) {
		throw new Error(
			'No database found. Run `npm start` (`netlify dev`) in another terminal so it provisions ' +
				'the local database, then run this again — or point NETLIFY_DB_URL at a database ' +
				'yourself.',
		);
	}
	if (!isLocalDatabase(connectionString) && !values.force) {
		throw new Error(
			'That database is not on localhost, and fake data does not belong in a shared one. ' +
				'Re-run with --force if you are certain.',
		);
	}

	// The database client reads these when it is first imported, so they have to be set before it
	// is. `server` picks the plain Postgres driver, which is what a local database speaks.
	process.env.NETLIFY_DB_URL = connectionString;
	process.env.NETLIFY_DB_DRIVER ??= 'server';

	const { db } = await import('../db/index.mjs');
	const { guests, marketEvents, registrationQuestions, visits } = await import('../db/schema.mjs');
	const { issueVisitToken, normalizePhone } =
		await import('../netlify/services/guestCredentials.mjs');

	if (values.reset) {
		await db.execute(sql`
			TRUNCATE TABLE
				notification_deliveries,
				push_subscriptions,
				visits,
				registration_questions,
				market_events,
				guests,
				guest_pin_attempts
			CASCADE
		`);
		console.log('Cleared every existing row.');
	}

	const data = buildFakeData({
		sessions: positiveNumber(values.sessions, 'sessions'),
		guests: positiveNumber(values.guests, 'guests'),
		capacity: positiveNumber(values.capacity, 'capacity'),
		seed: positiveNumber(values.seed, 'seed'),
		openSession: values['open-session'],
		now: new Date(),
	});

	for (const rows of chunk(data.guests, 500)) {
		await db.insert(guests).values(
			rows.map((guest) => ({
				...guest,
				normalizedPhone: normalizePhone(guest.phone),
			})),
		);
	}
	for (const rows of chunk(data.sessions, 500)) {
		await db.insert(marketEvents).values(rows);
	}
	for (const rows of chunk(data.questions, 500)) {
		await db.insert(registrationQuestions).values(rows);
	}
	for (const rows of chunk(data.visits, 500)) {
		await db
			.insert(visits)
			.values(rows.map((visit) => ({ ...visit, accessTokenHash: issueVisitToken().tokenHash })));
	}

	summarize(data);
}

try {
	await main();
	process.exit(0);
} catch (error) {
	// Drizzle reports a failed insert as its own `Failed query: ...` and keeps the Postgres error —
	// the one that actually says what was wrong — on `cause`. Print both, or debugging is guesswork.
	if (error instanceof Error) {
		console.error(error.message.split('\n')[0]);
		if (error.cause instanceof Error) {
			console.error(error.cause.message);
		}
	} else {
		console.error(error);
	}
	process.exit(1);
}
