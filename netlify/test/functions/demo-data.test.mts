import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));
vi.mock('../../lib/auth.mjs', () => ({ requirePermission: vi.fn() }));
vi.mock('../../services/demoScenario.mjs', () => ({
	demoDataToolsEnabled: vi.fn(),
	loadScenario: vi.fn(),
}));

import { requirePermission } from '../../lib/auth.mjs';
import handler from '../../routes/admin/demo-data.mjs';
import { demoDataToolsEnabled, loadScenario } from '../../services/demoScenario.mjs';

function request(method: string, options: { body?: unknown } = {}) {
	return new Request('https://example.com/api/admin/demo-data', {
		method,
		headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
		body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
	});
}

afterEach(() => {
	resetDbStub();
	vi.mocked(requirePermission).mockReset();
	vi.mocked(demoDataToolsEnabled).mockReset();
	vi.mocked(loadScenario).mockReset();
});

describe('demo-data handler routing', () => {
	it('returns the requirePermission response when unauthorized, without checking anything else', async () => {
		const unauthorized = Response.json({ error: 'Authorization required.' }, { status: 401 });

		vi.mocked(requirePermission).mockResolvedValueOnce(unauthorized);

		const response = await handler(request('GET'));

		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toEqual({ error: 'Authorization required.' });
		expect(response.headers.get('Cache-Control')).toBe('no-store');
		expect(demoDataToolsEnabled).not.toHaveBeenCalled();
	});

	it('returns 405 for unsupported methods once authorized', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);

		const response = await handler(request('DELETE'));

		expect(response.status).toBe(405);
	});
});

describe('GET /api/admin/demo-data', () => {
	it('reports whether demo data tools are enabled on this deploy', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		vi.mocked(demoDataToolsEnabled).mockReturnValueOnce(true);

		const response = await handler(request('GET'));

		await expect(response.json()).resolves.toEqual({ enabled: true });
	});
});

describe('POST /api/admin/demo-data', () => {
	it('rejects an invalid stage', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);

		const response = await handler(request('POST', { body: { stage: 'not-a-stage' } }));

		expect(response.status).toBe(400);
		expect(loadScenario).not.toHaveBeenCalled();
	});

	it('rejects an invalid service progress level', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);

		const response = await handler(
			request('POST', { body: { stage: 'service_started', serviceProgress: 'sprinting' } }),
		);

		expect(response.status).toBe(400);
		expect(loadScenario).not.toHaveBeenCalled();
	});

	it('answers 404 when demo data tools are disabled, without loading anything', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		vi.mocked(demoDataToolsEnabled).mockReturnValueOnce(false);

		const response = await handler(request('POST', { body: { stage: 'draft' } }));

		expect(response.status).toBe(404);
		expect(loadScenario).not.toHaveBeenCalled();
	});

	it('loads the scenario and returns the refreshed overview once enabled', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		vi.mocked(demoDataToolsEnabled).mockReturnValueOnce(true);
		vi.mocked(loadScenario).mockResolvedValueOnce({ ok: true });
		queueResult([]); // marketOverview finds no current event left to show

		const response = await handler(
			request('POST', { body: { stage: 'service_started', serviceProgress: 'halfway' } }),
		);

		expect(loadScenario).toHaveBeenCalledWith({
			stage: 'service_started',
			serviceProgress: 'halfway',
		});
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ event: null, questions: [], counts: {} });
		expect(db.select).toHaveBeenCalledOnce();
	});
});
