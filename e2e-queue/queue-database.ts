import { createConnection } from 'node:net';

import { readRigState } from './rig-state';

export interface QueueVisit {
	id: string;
	first_name: string;
	status: string;
	queue_position: number | null;
	called_at: string | null;
	served_at: string | null;
}

/** Fixture IPC shares the harness's database queue with real Netlify handler invocations. */
export class QueueDatabase {
	private readonly socketPath = readRigState().socketPath;

	async reset(): Promise<void> {
		await this.command('reset');
	}

	async visits(): Promise<QueueVisit[]> {
		return (await this.command('visits')) as QueueVisit[];
	}

	private command(command: 'reset' | 'visits'): Promise<unknown> {
		return new Promise((resolve, reject) => {
			const socket = createConnection(this.socketPath);
			let data = '';

			socket.setEncoding('utf8');
			socket.setTimeout(20_000, () => socket.destroy(new Error('Database fixture timed out.')));
			socket.once('error', reject);
			socket.once('connect', () => socket.write(command + '\n'));
			socket.on('data', (chunk: string) => {
				data += chunk;
			});
			socket.once('end', () => {
				try {
					const message = JSON.parse(data) as { result?: unknown; error?: string };

					if (message.error) {
						reject(new Error(message.error));
					} else {
						resolve(message.result);
					}
				} catch (error) {
					reject(error);
				}
			});
		});
	}
}
