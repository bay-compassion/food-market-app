import type { Permission } from '../../../src/services/permissions.js';
import { requirePermission } from '../../lib/auth.mjs';
import { withPermission } from '../../lib/http-auth.mjs';
import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
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
} from '../../services/marketSession.mjs';

async function overview() {
	return Response.json(await marketOverview());
}

async function history() {
	return Response.json(await marketHistory());
}

async function saveSettings(request: Request) {
	const body = await jsonBody(request);
	const settings = parseSettings(body);

	if (!settings) {
		return jsonError('Please provide valid lottery settings.');
	}

	const result = await saveSettingsService(settings);

	return result.ok ? overview() : jsonError(result.error, result.status);
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
	const body = await jsonBody(request);
	const name = (body as { action?: unknown } | null)?.action;
	const action = typeof name === 'string' ? actions[name] : undefined;

	// Gate before saying whether the action exists, so an unauthenticated caller cannot use the
	// difference between "invalid action" and "forbidden" to map what this endpoint accepts.
	const forbidden = await requirePermission(request, action?.permission ?? 'manage:sessions');

	if (forbidden) {
		return forbidden;
	}

	if (!action) {
		return jsonError('Invalid market action.');
	}

	const event = await getCurrentEvent();

	if (!event) {
		return jsonError('No market event has been configured.', 409);
	}

	const result = await action.run(event, body);

	return result.ok ? overview() : jsonError(result.error, result.status);
}

export const marketRoutes = createRouter();

marketRoutes.get('/api/market', async (context) => {
	// The overview drives the guest app's own screens, so it stays open to everyone.
	if (context.req.query('view') !== 'history') {
		return overview();
	}
	// Past sessions are where a worker records someone served out of band — the same job as
	// running the queue, just after the fact.
	const forbidden = await requirePermission(context.req.raw, 'run:queue');

	if (forbidden) {
		return forbidden;
	}

	return history();
});
marketRoutes.put('/api/market', withPermission('manage:sessions'), (context) =>
	saveSettings(context.req.raw),
);
marketRoutes.post('/api/market', (context) => runAction(context.req.raw));
marketRoutes.all('/api/market', methodNotAllowed);

export default routeHandler(marketRoutes);
