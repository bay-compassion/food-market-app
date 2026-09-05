import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface RigState {
	baseURL: string;
	socketPath: string;
	adminToken: string;
}

export function readRigState(): RigState {
	const path = process.env.QUEUE_RIG_STATE;

	if (!path) {
		throw new Error('Run queue tests through npm run test:e2e:queue.');
	}
	const state = JSON.parse(readFileSync(path, 'utf8')) as RigState;

	if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(state.baseURL).hostname)) {
		throw new Error('Queue tests require the owned local server and database.');
	}

	if (state.socketPath !== join(dirname(path), 'db.sock')) {
		throw new Error('Fixture socket does not belong to this rig.');
	}

	return state;
}
