import { z } from 'zod';

import type { Permission } from '../../../src/services/permissions.js';
import { withPermission, type AdminEnv } from '../../lib/http-auth.mjs';
import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
import { runLottery } from '../../services/lottery.mjs';
import {
	getCurrentEvent,
	marketHistory,
	marketOverview,
	type ActionResult,
	type MarketEventRow,
} from '../../services/marketSession.mjs';
import { requestNotificationDispatch } from '../../services/notificationDispatch.mjs';
import type { NotificationType } from '../../services/pushNotifications.mjs';
import {
	closeRegistration,
	closeSession,
	openRegistration,
	postponeLottery,
	postponeRegistration,
	reopenRegistration,
	resetSession,
	updateRegistration,
} from '../../services/sessionCommands.mjs';

async function overview() {
	return Response.json(await marketOverview());
}

async function history() {
	return Response.json(await marketHistory());
}

type MarketAction = {
	permission: Permission;
	run: (event: MarketEventRow, body: unknown) => Promise<ActionResult>;
	notificationTypes?: NotificationType[];
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
		notificationTypes: ['registration_closed'],
	},
	close_session: { permission: 'run:queue', run: (event) => closeSession(event) },
	postpone_lottery: {
		permission: 'manage:sessions',
		run: (event, body) => postponeLottery(event, body),
	},
	run_lottery: {
		permission: 'manage:sessions',
		run: (event) => runLottery(event),
		notificationTypes: ['lottery_selected', 'lottery_not_selected'],
	},
};

const actionRequestSchema = z.object({ action: z.string() });

/** Which session command a request is asking for, if it names one this deploy knows. */
function requestedAction(body: unknown) {
	const request = actionRequestSchema.safeParse(body);

	return request.success ? actions[request.data.action] : undefined;
}

async function runAction(request: Request) {
	const body = await jsonBody(request);
	const action = requestedAction(body);

	if (!action) {
		return jsonError('Invalid market action.');
	}

	const event = await getCurrentEvent();

	if (!event) {
		return jsonError('No market event has been configured.', 409);
	}

	const result = await action.run(event, body);

	if (result.ok && action.notificationTypes) {
		await requestNotificationDispatch({
			marketEventId: event.id,
			types: action.notificationTypes,
		});
	}

	return result.ok ? overview() : jsonError(result.error, result.status);
}

export const adminMarketRoutes = createRouter<AdminEnv>();

adminMarketRoutes.get('/market', withPermission('run:queue'), () => history());
adminMarketRoutes.post(
	'/market',
	async (context, next) => {
		const action = requestedAction(await jsonBody(context.req.raw.clone()));

		return withPermission(action?.permission ?? 'manage:sessions')(context, next);
	},
	(context) => runAction(context.req.raw),
);
adminMarketRoutes.all('/market', methodNotAllowed);

export default routeHandler(createRouter().route('/api/admin', adminMarketRoutes));
