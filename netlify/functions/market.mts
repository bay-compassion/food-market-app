import { Config } from '@netlify/functions';

import type { Permission } from '../../src/services/permissions.js';
import { requirePermission } from '../lib/auth.mjs';
import {
	closeRegistration,
	closeSession,
	getCurrentEvent,
	marketHistory,
	marketOverview,
	openRegistration,
	parseSettings,
	postponeRegistration,
	reopenRegistration,
	resetSession,
	runLottery,
	saveSettings as saveSettingsService,
	scheduleRegistration,
	updateRegistration,
	type ActionResult,
	type MarketEventRow,
} from '../services/marketSession.mjs';

function error(message: string, status = 400) {
	return Response.json({ error: message }, { status });
}

async function overview() {
	return Response.json(await marketOverview());
}

async function history() {
	return Response.json(await marketHistory());
}

async function saveSettings(request: Request) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return error('Request body must be valid JSON.');
	}
	const settings = parseSettings(body);
	if (!settings) {
		return error('Please provide valid lottery settings.');
	}

	const result = await saveSettingsService(settings);

	return result.ok ? overview() : error(result.error, result.status);
}

type MarketAction = {
	permission: Permission;
	run: (event: MarketEventRow, body: unknown) => Promise<ActionResult>;
};

/**
 * Every action carries the permission it needs. Steering a session belongs to whoever set it up,
 * but `close_session` is the exception: its button lives on the queue screen a worker runs all
 * day, and ending the day is part of that job.
 */
const actions: Record<string, MarketAction> = {
	reset_session: { permission: 'manage:sessions', run: (event) => resetSession(event) },
	update_registration: {
		permission: 'manage:sessions',
		run: (event, body) => updateRegistration(event, body),
	},
	schedule_registration: {
		permission: 'manage:sessions',
		run: (event) => scheduleRegistration(event),
	},
	postpone_registration: {
		permission: 'manage:sessions',
		run: (event, body) => postponeRegistration(event, body),
	},
	open_registration: { permission: 'manage:sessions', run: (event) => openRegistration(event) },
	reopen_registration: {
		permission: 'manage:sessions',
		run: (event) => reopenRegistration(event),
	},
	close_registration: {
		permission: 'manage:sessions',
		run: (event) => closeRegistration(event),
	},
	close_session: { permission: 'run:queue', run: (event) => closeSession(event) },
	run_lottery: { permission: 'manage:sessions', run: (event) => runLottery(event) },
};

async function runAction(request: Request) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return error('Request body must be valid JSON.');
	}
	const name = (body as { action?: unknown } | null)?.action;
	const action = typeof name === 'string' ? actions[name] : undefined;

	// Gate before saying whether the action exists, so an unauthenticated caller cannot use the
	// difference between "invalid action" and "forbidden" to map what this endpoint accepts.
	const forbidden = await requirePermission(request, action?.permission ?? 'manage:sessions');
	if (forbidden) {
		return forbidden;
	}
	if (!action) {
		return error('Invalid market action.');
	}

	const event = await getCurrentEvent();
	if (!event) {
		return error('No market event has been configured.', 409);
	}

	const result = await action.run(event, body);

	return result.ok ? overview() : error(result.error, result.status);
}

export default async (request: Request) => {
	if (request.method === 'GET') {
		// The overview drives the guest app's own screens, so it stays open to everyone.
		if (new URL(request.url).searchParams.get('view') !== 'history') {
			return overview();
		}
		// Past sessions are where a worker records someone served out of band — the same job as
		// running the queue, just after the fact.
		const forbidden = await requirePermission(request, 'run:queue');
		if (forbidden) {
			return forbidden;
		}

		return history();
	}
	if (request.method === 'PUT') {
		const forbidden = await requirePermission(request, 'manage:sessions');
		if (forbidden) {
			return forbidden;
		}

		return saveSettings(request);
	}
	if (request.method === 'POST') {
		return runAction(request);
	}

	return error('Method not allowed', 405);
};

export const config: Config = { path: '/api/market' };
