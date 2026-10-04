import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));
vi.mock('../../lib/auth.mjs', () => ({ requirePermission: vi.fn() }));
vi.mock('../../services/marketSession.mjs', () => ({ getCurrentEvent: vi.fn() }));

import { requirePermission } from '../../lib/auth.mjs';
import handler from '../../routes/admin/kiosk.mjs';
import { getCurrentEvent } from '../../services/marketSession.mjs';

type CurrentEvent = Awaited<ReturnType<typeof getCurrentEvent>>;

function request(method = 'GET') {
	return new Request('https://example.com/api/admin/kiosk', { method });
}

function currentEvent(status: string) {
	vi.mocked(getCurrentEvent).mockResolvedValueOnce({ id: 'event-1', status } as CurrentEvent);
}

afterEach(() => {
	resetDbStub();
	vi.mocked(requirePermission).mockReset();
	vi.mocked(getCurrentEvent).mockReset();
});

describe('kiosk handler', () => {
	it('returns 405 for unsupported methods', async () => {
		// Act
		const response = await handler(request('POST'));

		// Assert
		expect(response.status).toBe(405);
	});

	it('passes a refusal through without reading the session', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(
			Response.json({ error: 'Authorization required.' }, { status: 401 }),
		);

		// Act
		const response = await handler(request());

		// Assert
		expect(response.status).toBe(401);
		expect(getCurrentEvent).not.toHaveBeenCalled();
	});

	it('reports no session when none is configured', async () => {
		// Arrange
		vi.mocked(getCurrentEvent).mockResolvedValueOnce(null);

		// Act
		const response = await handler(request());

		// Assert
		await expect(response.json()).resolves.toEqual({
			sessionStatus: null,
			nowCalling: null,
			called: [],
			waitingCount: 0,
		});
	});

	it('skips the queue before service starts', async () => {
		// Arrange
		currentEvent('lottery_pending');

		// Act
		const response = await handler(request());

		// Assert
		await expect(response.json()).resolves.toEqual({
			sessionStatus: 'lottery_pending',
			nowCalling: null,
			called: [],
			waitingCount: 0,
		});
		expect(db.select).not.toHaveBeenCalled();
	});

	it('returns the number being called, those not yet claimed, and the line behind them', async () => {
		// Arrange
		currentEvent('service_started');
		queueResult([{ queuePosition: 8 }, { queuePosition: 7 }, { queuePosition: 3 }]);
		queueResult([{ count: 12 }]);
		queueResult([{ queuePosition: 8 }]);

		// Act
		const response = await handler(request());

		// Assert
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			sessionStatus: 'service_started',
			nowCalling: 8,
			called: [8, 7, 3],
			waitingCount: 12,
		});
	});
});
