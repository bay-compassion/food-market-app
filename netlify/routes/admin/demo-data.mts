import { isServiceProgress } from '../../../src/services/demoScenario.js';
import { isSessionStatus } from '../../../src/services/sessionStateMachine.js';
import { withPermission } from '../../lib/http-auth.mjs';
import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
import { demoDataToolsEnabled, loadScenario } from '../../services/demoScenario.mjs';
import { marketOverview } from '../../services/marketSession.mjs';

async function runLoad(request: Request) {
	const body = await jsonBody(request);
	const stage = (body as { stage?: unknown } | null)?.stage;
	const serviceProgress = (body as { serviceProgress?: unknown } | null)?.serviceProgress;

	if (!isSessionStatus(stage)) {
		return jsonError('Please provide a valid lifecycle stage.');
	}

	if (serviceProgress !== undefined && !isServiceProgress(serviceProgress)) {
		return jsonError('Please provide a valid service progress level.');
	}

	// Not available on this deploy at all — answer the same as a deploy that never registered this
	// route, so nothing here reveals whether the caller merely lacks the permission or the deploy
	// simply hasn't opted in with ENABLE_DEMO_DATA_TOOLS.
	if (!demoDataToolsEnabled()) {
		return jsonError('Not found.', 404);
	}

	const demoRoster = await loadScenario({ stage, serviceProgress });

	return Response.json(
		{ ...(await marketOverview()), demoRoster },
		{ headers: { 'Cache-Control': 'no-store' } },
	);
}

export const demoRoutes = createRouter();

// Gate on the permission before anything else, so an unauthenticated caller cannot use this
// endpoint's responses to learn whether demo data tools are even enabled here.
demoRoutes.use('/demo-data', withPermission('manage:demo-data'));
demoRoutes.get('/demo-data', () => Response.json({ enabled: demoDataToolsEnabled() }));
demoRoutes.post('/demo-data', (context) => runLoad(context.req.raw));
demoRoutes.all('/demo-data', methodNotAllowed);

export default routeHandler(createRouter().route('/api/admin', demoRoutes));
