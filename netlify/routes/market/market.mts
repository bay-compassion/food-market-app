import { createRouter, jsonError, methodNotAllowed, routeHandler } from '../../lib/http.mjs';
import { marketOverview } from '../../services/marketSession.mjs';

export const marketRoutes = createRouter();

marketRoutes.get('/api/market', async (context) => {
	if (context.req.query('view') === 'history') {
		return jsonError('Not found.', 404);
	}

	return Response.json(await marketOverview());
});
marketRoutes.all('/api/market', methodNotAllowed);

export default routeHandler(marketRoutes);
