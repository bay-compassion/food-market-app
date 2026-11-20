import { z } from 'zod';

import { oddsReasons, oddsScopes, oddsWeights } from '../../../src/services/steward-api.js';
import { withAuth0, withPermission, workerActor, type AdminEnv } from '../../lib/http-auth.mjs';
import { createRouter, jsonBody, jsonError, routeHandler } from '../../lib/http.mjs';
import { getLogger } from '../../lib/logging.mjs';
import { readStewardLedger, saveOddsChange } from '../../services/steward-ledger.mjs';

const changeSchema = z.object({
	// Only the named tiers: unlike the 1 to 100 the database allows, nothing here can type a number.
	weight: z.union(oddsWeights.map((weight) => z.literal(weight))),
	scope: z.enum(oddsScopes),
	reason: z.enum(oddsReasons),
	note: z.string().trim().max(280).optional(),
});

const stewardRoutes = createRouter<AdminEnv>();

// On the whole router, so a new steward endpoint can't forget it. No response here is cached:
// `routeHandler` marks everything `no-store`.
stewardRoutes.use('*', withPermission('read:stewardship'));

stewardRoutes.get('/ledger', async () => Response.json(await readStewardLedger()));

stewardRoutes.post('/people/:id/odds', withPermission('manage:stewardship'), async (context) => {
	const guestId = z.uuid().safeParse(context.req.param('id'));
	const change = changeSchema.safeParse(await jsonBody(context.req.raw));

	if (!guestId.success || !change.success) {
		return jsonError('Choose odds, how long they last, and a reason.');
	}

	const actor = workerActor(context);
	const result = await saveOddsChange(guestId.data, change.data, {
		id: actor.kind === 'worker' ? actor.id : null,
		name: actor.kind === 'worker' ? actor.name : null,
	});

	if (!result.ok) {
		return jsonError(result.error, result.status);
	}

	getLogger().info({
		message: 'lottery_odds.changed',
		guestId: guestId.data,
		changeId: result.id,
		actor: context.get('actor'),
	});

	return Response.json(result, { status: 201 });
});

export const stewardApi = createRouter<AdminEnv>();

stewardApi.use('*', withAuth0);
stewardApi.route('/', stewardRoutes);

export default routeHandler(createRouter<AdminEnv>().route('/api/steward', stewardRoutes));
