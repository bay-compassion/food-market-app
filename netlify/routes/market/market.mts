import { createRouter, jsonError, methodNotAllowed, routeHandler } from '../../lib/http.mjs';
import { guestMarketOverview } from '../../services/market-overview-cache.mjs';

export const marketRoutes = createRouter();

marketRoutes.get('/api/market', async (context) => {
	if (context.req.query('view') === 'history') {
		return jsonError('Not found.', 404);
	}

	return Response.json(await guestMarketOverview.get());
});

marketRoutes.all('/api/market', methodNotAllowed);

export default routeHandler(marketRoutes);
