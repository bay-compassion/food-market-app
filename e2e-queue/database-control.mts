import { createServer } from 'node:net';

import type { NetlifyDev } from '@netlify/dev';

import { buildScenario } from '../scripts/fake-data.mjs';

/**
 * Netlify's PGlite gateway shares one PostgreSQL session across connections. Serialize complete
 * handler invocations and fixture commands, not individual SQL statements inside transactions.
 * The private Unix socket is fixture IPC; no test routes are installed in the application.
 */
export class DatabaseControl {
	private pending: Promise<unknown> = Promise.resolve();
	private readonly server = createServer((socket) => {
		let input = '';

		socket.setEncoding('utf8');
		socket.on('error', () => {
			/* The test process may have been interrupted. */
		});
		socket.on('data', (chunk: string) => {
			input += chunk;

			if (!input.endsWith('\n')) {
				return;
			}
			const command = input.trim();

			input = '';
			void this.run(() => this.execute(command)).then(
				(result) => socket.end(JSON.stringify({ result }) + '\n'),
				(error: unknown) => socket.end(JSON.stringify({ error: String(error) }) + '\n'),
			);
		});
	});

	constructor(private readonly database: NonNullable<NetlifyDev['db']>) {}

	run<T>(operation: () => Promise<T>): Promise<T> {
		const next = this.pending.then(operation);

		this.pending = next.catch(() => undefined);

		return next;
	}

	async start(socketPath: string) {
		await new Promise<void>((resolve, reject) => {
			this.server.once('error', reject);
			this.server.listen(socketPath, resolve);
		});
	}

	async stop() {
		await this.pending;
		await new Promise<void>((resolve) => this.server.close(() => resolve()));
	}

	private async execute(command: string): Promise<unknown> {
		if (command === 'visits') {
			return (
				await this.database.query(
					`SELECT v.id, g.first_name, v.status, v.queue_position, v.called_at, v.served_at
				 FROM visits v JOIN guests g ON g.id = v.guest_id
				 ORDER BY v.queue_position NULLS LAST, g.first_name`,
				)
			).rows;
		}

		if (command !== 'reset') {
			throw new Error('Unknown fixture command.');
		}
		await this.database.exec('TRUNCATE guests, market_events CASCADE');
		const data = buildScenario({
			stage: 'registration_open',
			guests: 0,
			capacity: 3,
			seed: 1,
			now: new Date(),
		});
		const session = data.sessions[0]!;

		await this.database.query(
			`INSERT INTO market_events (id, registration_opens_at, registration_closes_at, capacity, session_mode, status)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
			[
				session.id,
				session.registrationOpensAt,
				new Date(Date.now() + 12 * 60 * 60 * 1000),
				session.capacity,
				'ad_hoc',
				session.status,
			],
		);

		return null;
	}
}
