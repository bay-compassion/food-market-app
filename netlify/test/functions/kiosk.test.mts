// @vitest-environment node
// jose checks `instanceof Uint8Array`, which a jsdom realm's buffers fail.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));
vi.mock('../../lib/auth.mjs', () => ({ requirePermission: vi.fn() }));
vi.mock('../../services/marketSession.mjs', () => ({ getCurrentEvent: vi.fn() }));

import { requirePermission } from '../../lib/auth.mjs';
import adminHandler from '../../routes/admin/kiosk.mjs';
import handler from '../../routes/kiosk/kiosk.mjs';
import { KioskAccess } from '../../services/kiosk-access.mjs';
import { getCurrentEvent } from '../../services/marketSession.mjs';

type CurrentEvent = Awaited<ReturnType<typeof getCurrentEvent>>;

const secret = 'a-test-secret-that-is-long-enough-to-use';

function boardRequest(token?: string, method = 'GET') {
	return new Request('https://example.com/api/kiosk/board', {
		method,
		headers: token ? { Authorization: `Bearer ${token}` } : undefined,
	});
}

function unlockRequest(code: unknown) {
	return new Request('https://example.com/api/kiosk/unlock', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ code }),
	});
}

async function kioskToken() {
	const access = new KioskAccess(secret);

	return (await access.exchange(access.issueCode().code))!;
}

function currentEvent(status: string) {
	vi.mocked(getCurrentEvent).mockResolvedValueOnce({ id: 'event-1', status } as CurrentEvent);
}

beforeEach(() => {
	vi.stubEnv('KIOSK_SECRET', secret);
});

afterEach(() => {
	resetDbStub();
	vi.mocked(requirePermission).mockReset();
	vi.mocked(getCurrentEvent).mockReset();
	vi.unstubAllEnvs();
});

describe('unlock code handler', () => {
	it('passes a refusal through without issuing a code', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(
			Response.json({ error: 'Authorization required.' }, { status: 401 }),
		);

		// Act
		const response = await adminHandler(
			new Request('https://example.com/api/admin/kiosk/unlock-codes', { method: 'POST' }),
		);

		// Assert
		expect(response.status).toBe(401);
	});

	it('issues a code a display can unlock with', async () => {
		// Act
		const response = await adminHandler(
			new Request('https://example.com/api/admin/kiosk/unlock-codes', { method: 'POST' }),
		);
		const { code } = (await response.json()) as { code: string };
		const unlocked = await handler(unlockRequest(code));

		// Assert
		expect(response.status).toBe(200);
		expect(unlocked.status).toBe(200);
	});
});

describe('unlock handler', () => {
	it('trades a correct code for a token the board accepts', async () => {
		// Arrange
		const { code } = new KioskAccess(secret).issueCode();

		vi.mocked(getCurrentEvent).mockResolvedValueOnce(null);

		// Act
		const response = await handler(unlockRequest(code));
		const { token } = (await response.json()) as { token: string };
		const board = await handler(boardRequest(token));

		// Assert
		expect(board.status).toBe(200);
	});

	it.each([['000000x'], [123456], [null]])('refuses a malformed code (%s)', async (code) => {
		// Act
		const response = await handler(unlockRequest(code));

		// Assert
		expect(response.status).toBe(401);
	});

	it('refuses a wrong code', async () => {
		// Arrange
		const { code } = new KioskAccess(secret).issueCode();
		const wrong = code === '000000' ? '000001' : '000000';

		// Act
		const response = await handler(unlockRequest(wrong));

		// Assert
		expect(response.status).toBe(401);
	});
});

describe('board handler', () => {
	it('returns 405 for unsupported methods', async () => {
		// Act
		const response = await handler(boardRequest(undefined, 'POST'));

		// Assert
		expect(response.status).toBe(405);
	});

	it('turns away a display without a token before reading the session', async () => {
		// Act
		const response = await handler(boardRequest());

		// Assert
		expect(response.status).toBe(401);
		expect(getCurrentEvent).not.toHaveBeenCalled();
	});

	it('turns away a token signed with another secret', async () => {
		// Arrange
		const token = await kioskToken();

		vi.stubEnv('KIOSK_SECRET', `${secret}-rotated`);

		// Act
		const response = await handler(boardRequest(token));

		// Assert
		expect(response.status).toBe(401);
		expect(getCurrentEvent).not.toHaveBeenCalled();
	});

	it('reports no session when none is configured', async () => {
		// Arrange
		vi.mocked(getCurrentEvent).mockResolvedValueOnce(null);

		// Act
		const response = await handler(boardRequest(await kioskToken()));

		// Assert
		await expect(response.json()).resolves.toEqual({
			sessionStatus: null,
			nowCalling: null,
			called: [],
			calledPriority: [],
			waitingCount: 0,
		});
	});

	it('skips the queue before service starts', async () => {
		// Arrange
		currentEvent('lottery_pending');

		// Act
		const response = await handler(boardRequest(await kioskToken()));

		// Assert
		await expect(response.json()).resolves.toEqual({
			sessionStatus: 'lottery_pending',
			nowCalling: null,
			called: [],
			calledPriority: [],
			waitingCount: 0,
		});
		expect(db.select).not.toHaveBeenCalled();
	});

	it('returns the number being called, those not yet claimed in either series, and the line behind them', async () => {
		// Arrange
		currentEvent('service_started');
		queueResult([
			{ queuePosition: 8, priorityNumber: null },
			{ queuePosition: null, priorityNumber: 1 },
			{ queuePosition: 7, priorityNumber: null },
			{ queuePosition: 3, priorityNumber: null },
		]);
		queueResult([{ count: 12 }]);
		queueResult([{ queuePosition: 8 }]);

		// Act
		const response = await handler(boardRequest(await kioskToken()));

		// Assert
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			sessionStatus: 'service_started',
			nowCalling: 8,
			called: [8, 7, 3],
			calledPriority: [1],
			waitingCount: 12,
		});
	});
});
