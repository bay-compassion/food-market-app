import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));
vi.mock('../../lib/auth.mjs', () => ({ requirePermission: vi.fn() }));
vi.mock('../../services/visit-events.mjs', () => ({ listVisitEvents: vi.fn() }));

import { requirePermission } from '../../lib/auth.mjs';
import handler from '../../routes/admin/visit-events.mjs';
import { listVisitEvents } from '../../services/visit-events.mjs';

const visitId = '6f1c2a4e-3b5d-4c7e-9f80-1a2b3c4d5e6f';

function request(method: string, id = visitId) {
	return new Request(`https://example.com/api/admin/visits/${id}/events`, { method });
}

afterEach(() => {
	resetDbStub();
	vi.mocked(requirePermission).mockReset();
	vi.mocked(listVisitEvents).mockReset();
});

describe('visit events handler', () => {
	it('returns the visit’s history', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		vi.mocked(listVisitEvents).mockResolvedValueOnce([
			{
				id: 'event-1',
				kind: 'called',
				toStatus: 'called',
				actor: { kind: 'worker', id: 'auth0|worker', name: 'Matt' },
				details: {},
				createdAt: '2026-10-05T18:00:00.000Z',
			},
		]);

		const response = await handler(request('GET'));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toMatchObject({ events: [{ id: 'event-1' }] });
		expect(listVisitEvents).toHaveBeenCalledWith(visitId);
	});

	it('rejects a visit id that is not a UUID without reading anything', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);

		const response = await handler(request('GET', 'visit-1'));

		expect(response.status).toBe(400);
		expect(listVisitEvents).not.toHaveBeenCalled();
	});

	it('refuses a worker without the permission', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(
			Response.json({ error: 'Your account does not have access to this.' }, { status: 403 }),
		);

		const response = await handler(request('GET'));

		expect(response.status).toBe(403);
		expect(listVisitEvents).not.toHaveBeenCalled();
	});

	it('returns 405 for other methods', async () => {
		const response = await handler(request('DELETE'));

		expect(response.status).toBe(405);
	});
});
