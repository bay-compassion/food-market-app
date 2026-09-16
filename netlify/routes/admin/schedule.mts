import type { Context } from 'hono';

import { withPermission, type AdminEnv } from '../../lib/http-auth.mjs';
import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
import type { ActionResult } from '../../services/marketSession.mjs';
import { getSchedule } from '../../services/schedule.mjs';
import {
	createNextSessionNow,
	deletePattern,
	savePattern,
} from '../../services/schedulePattern.mjs';
import {
	addOneOffSession,
	deleteSession,
	updateSession,
} from '../../services/scheduleSessions.mjs';
import { parsePatternInput, parseSessionInput } from '../../services/sessionInput.mjs';

/** Every write answers with the whole schedule, so the tab replaces its state in one step. */
async function respond(result: ActionResult) {
	return result.ok ? Response.json(await getSchedule()) : jsonError(result.error, result.status);
}

async function withPattern(context: Context<AdminEnv>) {
	const input = parsePatternInput(await jsonBody(context.req.raw));

	return input ? respond(await savePattern(input)) : jsonError('Please provide a valid pattern.');
}

async function withSession(
	context: Context<AdminEnv>,
	run: (input: NonNullable<ReturnType<typeof parseSessionInput>>) => Promise<ActionResult>,
) {
	const input = parseSessionInput(await jsonBody(context.req.raw));

	return input ? respond(await run(input)) : jsonError('Please provide a valid session.');
}

export const adminScheduleRoutes = createRouter<AdminEnv>();

adminScheduleRoutes.use('/schedule', withPermission('manage:sessions'));
adminScheduleRoutes.use('/schedule/*', withPermission('manage:sessions'));

adminScheduleRoutes.get('/schedule', async () => Response.json(await getSchedule()));
adminScheduleRoutes.all('/schedule', methodNotAllowed);

adminScheduleRoutes.put('/schedule/pattern', withPattern);
adminScheduleRoutes.delete('/schedule/pattern', async () => respond(await deletePattern()));
adminScheduleRoutes.all('/schedule/pattern', methodNotAllowed);

adminScheduleRoutes.post('/schedule/pattern/next-session', async () =>
	respond(await createNextSessionNow()),
);
adminScheduleRoutes.all('/schedule/pattern/next-session', methodNotAllowed);

adminScheduleRoutes.post('/schedule/sessions', (context) =>
	withSession(context, (input) => addOneOffSession(input)),
);
adminScheduleRoutes.all('/schedule/sessions', methodNotAllowed);

adminScheduleRoutes.patch('/schedule/sessions/:id', (context) =>
	withSession(context, (input) => updateSession(context.req.param('id'), input)),
);
adminScheduleRoutes.delete('/schedule/sessions/:id', async (context) =>
	respond(await deleteSession(context.req.param('id'))),
);
adminScheduleRoutes.all('/schedule/sessions/:id', methodNotAllowed);

export default routeHandler(createRouter().route('/api/admin', adminScheduleRoutes));
