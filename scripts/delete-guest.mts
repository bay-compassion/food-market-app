#!/usr/bin/env node

/**
 * Permanently deletes one guest and everything stored about them, from the command line. The
 * dashboard's guest database does the same with a dialog (`delete:guest-data`), and that is the
 * route to use; this is the fallback when the dashboard is unavailable. Both run the deletion in
 * `netlify/services/guest-deletion.mts`, after the steps in `docs/guest-deletion.md`.
 *
 * Nothing changes without `--confirm`, which takes the guest's phone number — the same check the
 * dashboard makes an admin type.
 *
 * Usage:
 *   npm run guest:delete -- --phone="925-555-0100"                          # find the guest
 *   npm run guest:delete -- --guest-id=<id>                                 # what would go
 *   npm run guest:delete -- --guest-id=<id> --confirm="925-555-0100"        # delete it
 */

import { parseArgs } from 'node:util';

import { guestDataTables } from '../src/services/guest-deletion.js';
import {
	databaseHost,
	reportFailure,
	resolveConnectionString,
	useDatabase,
} from './database-connection.mjs';

const usage = `Usage: npm run guest:delete -- [options]

  --phone=NUMBER     list the guests with this phone number (changes nothing)
  --guest-id=ID      show everything stored about this guest (changes nothing)
  --confirm=NUMBER   with --guest-id, permanently delete it; NUMBER is the guest's phone number
  --help             show this message
`;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function raise(message: string): never {
	throw new Error(message);
}

function lastFour(phone: string) {
	return `…${phone.replace(/\D/g, '').slice(-4)}`;
}

async function main() {
	const { values } = parseArgs({
		options: {
			phone: { type: 'string' },
			'guest-id': { type: 'string' },
			confirm: { type: 'string' },
			help: { type: 'boolean', default: false },
		},
	});

	if (values.help || (!values.phone && !values['guest-id'])) {
		console.log(usage);

		return;
	}

	const connectionString =
		resolveConnectionString() ??
		raise(
			'No database found. Set NETLIFY_DB_URL, or run `npm start` (`netlify dev`) in another ' +
				'terminal to use the local database.',
		);

	useDatabase(connectionString);
	const { db } = await import('../db/index.mjs');
	const { GuestDeletion } = await import('../netlify/services/guest-deletion.mjs');

	console.log(`Database: ${databaseHost(connectionString) ?? 'unknown'}\n`);

	if (values.phone) {
		const matches = await GuestDeletion.findByPhone(db, values.phone);

		if (matches.length === 0) {
			console.log('No guest has that phone number.');

			return;
		}
		console.table(
			matches.map((guest) => ({
				'guest id': guest.id,
				name: `${guest.firstName} ${guest.lastName}`,
				created: guest.createdAt.toISOString().slice(0, 10),
			})),
		);
		console.log('\nRe-run with --guest-id=<id> to see what deleting one would remove.');

		return;
	}

	const guestId = values['guest-id'] ?? raise('--guest-id is required.');

	if (!uuidPattern.test(guestId)) {
		throw new Error(`"${guestId}" is not a guest id. Find one with --phone first.`);
	}

	const deletion = new GuestDeletion(db, guestId);
	const preview =
		(await deletion.preview()) ??
		raise(`No guest has the id ${guestId}. It may already be deleted.`);

	console.log(
		`${preview.firstName} ${preview.lastName}, phone ${lastFour(preview.phone)}, ` +
			`signed up ${preview.signedUpAt.slice(0, 10)}` +
			(preview.inOpenSession ? ' — in a session that has not ended\n' : '\n'),
	);
	console.table(Object.fromEntries(guestDataTables.map((table) => [table, preview.rows[table]])));

	if (values.confirm === undefined) {
		console.log(
			'\nNothing was deleted. Re-run with --confirm=<their phone number> to delete these rows.',
		);

		return;
	}

	const result = await deletion.delete(values.confirm);

	if (!result.ok) {
		throw new Error(result.error);
	}
	console.log('\nDeleted. The rows above are gone and cannot be recovered from this database.');
}

try {
	await main();
	process.exit(0);
} catch (error) {
	reportFailure(error);
	process.exit(1);
}
