import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));
vi.mock('../../lib/auth.mjs', () => ({ requirePermission: vi.fn() }));

import { requirePermission } from '../../lib/auth.mjs';
import handler from '../../routes/admin/household-service.mjs';

const id = '00000000-0000-4000-8000-000000000001';
const marketEventId = '00000000-0000-4000-8000-000000000002';
const entry = {
	id,
	marketEventId,
	householdSize: 4,
	initialHouseholdSize: 4,
	version: 1,
	voidedAt: null,
};

function request(method: string, body?: object, path = '') {
	return new Request(`https://example.com/api/admin/household-service${path}`, {
		method,
		headers: { 'Content-Type': 'application/json' },
		body: body ? JSON.stringify(body) : undefined,
	});
}

afterEach(() => {
	resetDbStub();
	vi.mocked(requirePermission).mockReset();
});

describe('count-only household service', () => {
	it.each(['GET', 'POST', 'PATCH'])(
		'requires run:queue before any database access for %s',
		async (method) => {
			vi.mocked(requirePermission).mockResolvedValueOnce(Response.json({}, { status: 403 }));
			const response = await handler(
				request(method, method === 'GET' ? undefined : {}, method === 'PATCH' ? `/${id}` : ''),
			);

			expect(response.status).toBe(403);
			expect(requirePermission).toHaveBeenCalledWith(expect.any(Request), 'run:queue', undefined);
			expect(db.select).not.toHaveBeenCalled();
			expect(db.insert).not.toHaveBeenCalled();
			expect(db.update).not.toHaveBeenCalled();
		},
	);

	it.each([0, -1, 1.5, 31, '4', null])(
		'rejects invalid household size %s without touching the database',
		async (householdSize) => {
			const response = await handler(request('POST', { id, marketEventId, householdSize }));

			expect(response.status).toBe(400);
			expect(db.transaction).not.toHaveBeenCalled();
		},
	);

	it.each(['scheduled', 'registration_open', 'lottery_pending'])(
		'rejects recording before service (%s)',
		async (status) => {
			queueResult([{ status }]);
			const response = await handler(request('POST', { id, marketEventId, householdSize: 4 }));

			expect(response.status).toBe(409);
			expect(db.insert).not.toHaveBeenCalled();
		},
	);

	it.each(['service_started', 'ended'])(
		'records completed shopping in a %s session',
		async (status) => {
			queueResult([{ status }]);
			queueResult([]);
			queueResult([entry]);
			const response = await handler(request('POST', { id, marketEventId, householdSize: 4 }));

			expect(response.status).toBe(201);
			await expect(response.json()).resolves.toMatchObject(entry);
			expect(response.headers.get('Cache-Control')).toBe('no-store');
		},
	);

	it('returns the original record on a retry without inserting another household', async () => {
		queueResult([{ status: 'ended' }]);
		queueResult([entry]);
		const response = await handler(request('POST', { id, marketEventId, householdSize: 4 }));

		expect(response.status).toBe(200);
		expect(db.insert).not.toHaveBeenCalled();
	});

	it('confirms an uncertain create even after another worker corrected the saved household', async () => {
		queueResult([{ status: 'ended' }]);
		queueResult([{ ...entry, householdSize: 6, version: 2 }]);
		const response = await handler(request('POST', { id, marketEventId, householdSize: 4 }));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toMatchObject({ householdSize: 6, version: 2 });
		expect(db.insert).not.toHaveBeenCalled();
	});

	it('refuses reuse of an operation id for different details', async () => {
		queueResult([{ status: 'ended' }]);
		queueResult([entry]);
		expect((await handler(request('POST', { id, marketEventId, householdSize: 6 }))).status).toBe(
			409,
		);
		expect(db.insert).not.toHaveBeenCalled();
	});

	it('rejects a stale correction instead of overwriting another worker', async () => {
		queueResult([]);
		expect(
			(await handler(request('PATCH', { version: 1, householdSize: 5, voided: false }, `/${id}`)))
				.status,
		).toBe(409);
	});

	it('returns the saved correction or undo, with the incremented version', async () => {
		queueResult([{ ...entry, version: 2, voidedAt: '2026-11-01T12:00:00Z' }]);
		const response = await handler(
			request('PATCH', { version: 1, householdSize: 4, voided: true }, `/${id}`),
		);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toMatchObject({
			version: 2,
			voidedAt: expect.any(String),
		});
		expect(db.delete).not.toHaveBeenCalled();
	});

	it('lists entries only for a specified session', async () => {
		expect((await handler(request('GET'))).status).toBe(400);
		queueResult([entry]);
		const response = await handler(request('GET', undefined, `?marketEventId=${marketEventId}`));

		await expect(response.json()).resolves.toEqual([entry]);
	});
});
