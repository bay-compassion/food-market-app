import type { Config } from '@netlify/functions';

import { isServiceProgress } from '../../src/services/demoScenario.js';
import { isSessionStatus } from '../../src/services/sessionStateMachine.js';
import { requirePermission } from '../lib/auth.mjs';
import { demoDataToolsEnabled, loadScenario } from '../services/demoScenario.mjs';
import { marketOverview } from '../services/marketSession.mjs';

function error(message: string, status = 400) {
	return Response.json({ error: message }, { status });
}

async function overview() {
	return Response.json(await marketOverview());
}

async function runLoad(request: Request) {
	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return error('Request body must be valid JSON.');
	}
	const stage = (body as { stage?: unknown } | null)?.stage;
	const serviceProgress = (body as { serviceProgress?: unknown } | null)?.serviceProgress;

	if (!isSessionStatus(stage)) {
		return error('Please provide a valid lifecycle stage.');
	}

	if (serviceProgress !== undefined && !isServiceProgress(serviceProgress)) {
		return error('Please provide a valid service progress level.');
	}

	// Not available on this deploy at all — answer the same as a deploy that never registered this
	// route, so nothing here reveals whether the caller merely lacks the permission or the deploy
	// simply hasn't opted in with ENABLE_DEMO_DATA_TOOLS.
	if (!demoDataToolsEnabled()) {
		return error('Not found.', 404);
	}

	const result = await loadScenario({ stage, serviceProgress });

	return result.ok ? overview() : error(result.error, result.status);
}

export default async (request: Request) => {
	// Gate on the permission before anything else, so an unauthenticated caller cannot use this
	// endpoint's responses to learn whether demo data tools are even enabled here.
	const forbidden = await requirePermission(request, 'manage:demo-data');

	if (forbidden) {
		return forbidden;
	}

	if (request.method === 'GET') {
		return Response.json({ enabled: demoDataToolsEnabled() });
	}

	if (request.method === 'POST') {
		return runLoad(request);
	}

	return error('Method not allowed', 405);
};

export const config: Config = { path: '/api/demo-data' };
