import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/index.mjs', () => ({ db: {} }));

vi.mock('../../lib/auth.mjs', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../lib/auth.mjs')>()),
	verifyAuth0Token: vi.fn(),
}));

import { verifyAuth0Token } from '../../lib/auth.mjs';
import { withAuth0, type AdminEnv } from '../../lib/http-auth.mjs';
import { createRouter } from '../../lib/http.mjs';
import { WorkerDirectory } from '../../services/worker-directory.mjs';
import { workerRoutes } from './workers.mjs';

const app = createRouter<AdminEnv>();

app.use('*', withAuth0);
app.route('/', workerRoutes);

function request(path = '/workers', method = 'GET', body?: object) {
	return app.request(`https://market.test${path}`, {
		method,
		headers: { Authorization: 'Bearer verified', 'Content-Type': 'application/json' },
		body: body ? JSON.stringify(body) : undefined,
	});
}

beforeEach(() => {
	vi.stubEnv('AUTH0_MANAGEMENT_DOMAIN', 'tenant.auth0.com');
	vi.mocked(verifyAuth0Token).mockResolvedValue({
		payload: { sub: 'actor', permissions: ['manage:workers'] },
	} as unknown as Awaited<ReturnType<typeof verifyAuth0Token>>);
});
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
});

describe('Workers API', () => {
	it('rejects an unauthenticated caller before consulting management', async () => {
		// Arrange
		vi.mocked(verifyAuth0Token).mockRejectedValueOnce(new Error('invalid'));
		const authorize = vi.spyOn(WorkerDirectory.prototype, 'authorize');
		// Act
		const response = await request();

		// Assert
		expect(response.status).toBe(401);
		expect(authorize).not.toHaveBeenCalled();
	});

	it.each(['GET', 'POST', 'PATCH'])('denies workers on %s', async (method) => {
		// Arrange
		vi.mocked(verifyAuth0Token).mockResolvedValueOnce({
			payload: { sub: 'actor', permissions: ['run:queue'] },
		} as unknown as Awaited<ReturnType<typeof verifyAuth0Token>>);
		const authorize = vi.spyOn(WorkerDirectory.prototype, 'authorize');
		// Act
		const response = await request(method === 'PATCH' ? '/workers/target' : '/workers', method);

		// Assert
		expect(response.status).toBe(403);
		expect(authorize).not.toHaveBeenCalled();
	});

	it.each([
		{ name: 'New', email: 'new@example.test', role: 'owner' },
		{ name: 'New', email: 'bad', role: 'worker' },
		{ name: 'New', email: 'new@example.test', role: 'worker', blocked: false },
	])('rejects unsafe account creation input', async (body) => {
		// Arrange
		vi.spyOn(WorkerDirectory.prototype, 'authorize').mockResolvedValue('actor');
		const add = vi.spyOn(WorkerDirectory.prototype, 'add');
		// Act
		const response = await request('/workers', 'POST', body);

		// Assert
		expect(response.status).toBe(400);
		expect(add).not.toHaveBeenCalled();
	});

	it('refuses an owner assignment command', async () => {
		// Arrange
		vi.spyOn(WorkerDirectory.prototype, 'authorize').mockResolvedValue('actor');
		const change = vi.spyOn(WorkerDirectory.prototype, 'change');
		// Act
		const response = await request('/workers/target', 'PATCH', { command: 'owner' });

		// Assert
		expect(response.status).toBe(400);
		expect(change).not.toHaveBeenCalled();
	});
});
