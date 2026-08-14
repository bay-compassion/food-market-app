import { Config } from '@netlify/functions';

import { requirePermission } from '../lib/auth.mjs';
import { getCurrentEvent } from '../services/marketSession.mjs';
import { callNextVisits } from '../services/visitQueue.mjs';

const maximumBatchSize = 50;

function error(message: string, status = 400) {
	return Response.json({ error: message }, { status });
}

export default async (request: Request) => {
	if (request.method !== 'POST') {
		return error('Method not allowed', 405);
	}
	const forbidden = await requirePermission(request, 'run:queue');
	if (forbidden) {
		return forbidden;
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return error('Request body must be valid JSON.');
	}
	const { action, count } = (body ?? {}) as Record<string, unknown>;
	if (action !== 'call_next') {
		return error('Invalid queue action.');
	}
	const batchSize = Number(count ?? 1);
	if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > maximumBatchSize) {
		return error(`Please call between 1 and ${maximumBatchSize} guests at a time.`);
	}

	const event = await getCurrentEvent();
	if (!event) {
		return error('No market event has been configured.', 409);
	}
	if (event.status !== 'service_started') {
		return error('Guests can only be called after service starts.', 409);
	}

	return Response.json({ called: await callNextVisits(event.id, batchSize) });
};

export const config: Config = { path: '/api/queue' };
