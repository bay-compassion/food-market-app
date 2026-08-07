import { requireAuth0 } from '../lib/auth.js';
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
} from '../services/marketSession.js';

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

const actions: Record<string, (event: MarketEventRow, body: unknown) => Promise<ActionResult>> = {
	reset_session: (event) => resetSession(event),
	update_registration: (event, body) => updateRegistration(event, body),
	schedule_registration: (event) => scheduleRegistration(event),
	postpone_registration: (event, body) => postponeRegistration(event, body),
	open_registration: (event) => openRegistration(event),
	reopen_registration: (event) => reopenRegistration(event),
	close_registration: (event) => closeRegistration(event),
	close_session: (event) => closeSession(event),
	run_lottery: (event) => runLottery(event),
};

async function runAction(request: Request) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return error('Request body must be valid JSON.');
	}
	const action = (body as { action?: unknown } | null)?.action;
	const event = await getCurrentEvent();
	if (!event) {
		return error('No market event has been configured.', 409);
	}

	const run = typeof action === 'string' ? actions[action] : undefined;
	if (!run) {
		return error('Invalid market action.');
	}

	const result = await run(event, body);

	return result.ok ? overview() : error(result.error, result.status);
}

export default async (request: Request) => {
	if (request.method === 'GET') {
		if (new URL(request.url).searchParams.get('view') === 'history') {
			const unauthorized = await requireAuth0(request);
			if (unauthorized) {
				return unauthorized;
			}

			return history();
		}

		return overview();
	}
	if (request.method === 'PUT') {
		const unauthorized = await requireAuth0(request);
		if (unauthorized) {
			return unauthorized;
		}

		return saveSettings(request);
	}
	if (request.method === 'POST') {
		const unauthorized = await requireAuth0(request);
		if (unauthorized) {
			return unauthorized;
		}

		return runAction(request);
	}

	return error('Method not allowed', 405);
};

export const config = { path: '/api/market' };
